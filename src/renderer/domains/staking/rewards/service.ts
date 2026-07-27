import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';

import { type Chain, type ExternalType } from '@/shared/core';
import { keys, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../constants';
import { type MonthlyRewardRecord, type RewardSource, type RewardsMap } from '../types';

const ASSET_HUB_CHAIN_IDS = new Set(Object.values(AssetHubChains));

function isAssetHubChain(chain?: Chain | null): boolean {
  if (!chain) return false;
  return ASSET_HUB_CHAIN_IDS.has(chain.chainId);
}

function collectRewardSources(
  sourceChain: Chain | undefined,
  type: ExternalType,
  map: Map<string, RewardSource>,
): void {
  if (!sourceChain) return;
  const external = sourceChain.externalApi?.[type];
  if (!external) return;

  for (const item of external) {
    if (item.type !== 'subquery' || map.has(item.url)) continue;

    map.set(item.url, {
      url: item.url,
      addressPrefix: sourceChain.addressPrefix,
    });
  }
}

export { collectRewardSources, isAssetHubChain };

/**
 * Pure helpers for callers that need reward sources for **several** chains at
 * once and therefore cannot go through the per-chain `useRewardSources` hook.
 */
export const rewardsService = { collectRewardSources, isAssetHubChain };

const GET_TOTAL_REWARDS = `
  query Rewards($addresses: [String!]) {
    accumulatedRewards(filter: { id: { in: $addresses } }) {
      nodes {
        id
        amount
      }
    }
  }
`;

const GET_PERIOD_REWARDS = `
  query RewardsForPeriod($addresses: [String!]!, $since: BigFloat!) {
    accountRewards(filter: {
      address: { in: $addresses }
      timestamp: { greaterThanOrEqualTo: $since }
    }) {
      groupedAggregates(groupBy: ADDRESS) {
        keys
        sum { amount }
      }
    }
  }
`;

const GET_MONTHLY_REWARDS = `
  query MonthlyRewards($addresses: [String!]!, $since: BigFloat!) {
    accountRewards(
      filter: {
        address: { in: $addresses }
        timestamp: { greaterThanOrEqualTo: $since }
      }
      orderBy: TIMESTAMP_ASC
    ) {
      nodes {
        address
        amount
        timestamp
      }
    }
  }
`;

type RewardsQuery = {
  accumulatedRewards: {
    nodes: {
      id: string;
      amount: string;
      __typename: string;
    }[];
    __typename: string;
  };
};

type PeriodRewardsQuery = {
  accountRewards: {
    groupedAggregates: {
      keys: string[];
      sum: { amount: string };
    }[];
  };
};

type MonthlyRewardsQuery = {
  accountRewards: {
    nodes: {
      address: string;
      amount: string;
      timestamp: string;
    }[];
  };
};

type FetchStakingRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  baseMap: RewardsMap;
  since?: number;
};

export const fetchStakingRewards = async ({
  accounts,
  rewardSources,
  baseMap,
  since,
}: FetchStakingRewardsParams): Promise<RewardsMap> => {
  if (accounts.length === 0 || rewardSources.length === 0) {
    return baseMap;
  }

  const buildAddresses = (prefix: number) => {
    return accounts.map(accountId => toAddress(accountId, { prefix }));
  };

  const sums = keys(baseMap).reduce<Record<AccountId, BN>>((acc, accountId) => {
    const value = baseMap[accountId];
    if (value !== undefined) {
      acc[accountId] = new BN(value);
    }

    return acc;
  }, {});

  await Promise.allSettled(
    rewardSources.map(async ({ url, addressPrefix }) => {
      try {
        const client = new GraphQLClient(url);
        const addresses = buildAddresses(addressPrefix);

        if (since !== undefined) {
          const data = await client.request<PeriodRewardsQuery>(GET_PERIOD_REWARDS, {
            addresses,
            since: since.toString(),
          });

          const aggregates = data.accountRewards?.groupedAggregates ?? [];

          for (const { keys: groupKeys, sum } of aggregates) {
            const address = groupKeys[0];
            if (!address) continue;
            const accountId = toAccountId(address);
            sums[accountId] = (sums[accountId] ?? new BN(0)).add(new BN(sum.amount));
          }
        } else {
          const data = await client.request<RewardsQuery>(GET_TOTAL_REWARDS, {
            addresses,
          });

          const nodes = data.accumulatedRewards?.nodes ?? [];

          for (const { id, amount } of nodes) {
            const accountId = toAccountId(id);
            sums[accountId] = (sums[accountId] ?? new BN(0)).add(new BN(amount));
          }
        }
      } catch (error) {
        console.error('Staking: rewards request failed for', url, error);
      }
    }),
  );

  const aggregated: RewardsMap = keys(sums).reduce<RewardsMap>(
    (acc, accountId) => {
      acc[accountId] = sums[accountId]!.toString();

      return acc;
    },
    { ...baseMap },
  );

  return aggregated;
};

type FetchMonthlyRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since: number;
};

export const fetchMonthlyRewards = async ({
  accounts,
  rewardSources,
  since,
}: FetchMonthlyRewardsParams): Promise<MonthlyRewardRecord[]> => {
  if (accounts.length === 0 || rewardSources.length === 0) {
    return [];
  }

  const allRecords: MonthlyRewardRecord[] = [];

  await Promise.allSettled(
    rewardSources.map(async ({ url, addressPrefix }) => {
      try {
        const client = new GraphQLClient(url);
        const addresses = accounts.map(accountId => toAddress(accountId, { prefix: addressPrefix }));

        const data = await client.request<MonthlyRewardsQuery>(GET_MONTHLY_REWARDS, {
          addresses,
          since: since.toString(),
        });

        const nodes = data.accountRewards?.nodes ?? [];

        for (const node of nodes) {
          allRecords.push({
            address: node.address,
            amount: node.amount,
            timestamp: Number(node.timestamp),
          });
        }
      } catch (error) {
        console.error('Staking: monthly rewards request failed for', url, error);
      }
    }),
  );

  return allRecords;
};
