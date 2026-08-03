import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
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

/**
 * How much of the chain graph is walked when looking for a chain's reward
 * sources.
 *
 * - `staking-chain` — the caller already knows `chain` is where the stake lives
 *   (a position's chain, the chain a claim landed on). Everything the chain
 *   itself and its relay can answer with is taken, with no question of whether
 *   the chain happens to be an Asset Hub.
 * - `chain-family` — `chain` comes from a plain chain list and may sit on either
 *   side of the staking migration, so the relation has to be derived rather
 *   than assumed.
 */
type RewardSourceScope = 'staking-chain' | 'chain-family';

/**
 * Every subquery endpoint that can answer for `chain`'s staking rewards.
 *
 * An Asset Hub needs more than one. Staking moved to the hub from its relay
 * chain, so rewards earned before the migration are only in the _relay's_
 * staking indexer, while what came after is served by the hub's own staking and
 * history indexers. Reading a single endpoint makes a stake look like it earned
 * nothing on one side of the migration date.
 *
 * The reverse walk — from a chain down to the Asset Hubs that name it as their
 * parent — is `chain-family` only. It exists because those callers iterate a
 * chain list and can hand us the _relay_, whose post-migration rewards now live
 * on its hub; a `staking-chain` caller already holds the hub itself, so walking
 * down from it would only pull in unrelated parachains.
 */
function collectChainRewardSources(
  chain: Chain,
  chainsMap: Record<ChainId, Chain>,
  scope: RewardSourceScope,
): RewardSource[] {
  const uniqueSources = new Map<string, RewardSource>();

  collectRewardSources(chain, ExternalType.STAKING, uniqueSources);

  if (scope === 'staking-chain' || isAssetHubChain(chain)) {
    collectRewardSources(chain, ExternalType.HISTORY, uniqueSources);

    if (chain.parentId) {
      collectRewardSources(chainsMap[chain.parentId], ExternalType.STAKING, uniqueSources);
    }
  }

  if (scope === 'chain-family') {
    for (const candidate of Object.values(chainsMap)) {
      if (candidate.parentId !== chain.chainId) continue;
      if (!isAssetHubChain(candidate)) continue;

      collectRewardSources(candidate, ExternalType.HISTORY, uniqueSources);
    }
  }

  return [...uniqueSources.values()];
}

export { collectChainRewardSources, collectRewardSources, isAssetHubChain };

/**
 * Pure helpers for callers that need reward sources for **several** chains at
 * once and therefore cannot go through the per-chain `useRewardSources` hook.
 */
export const rewardsService = { collectChainRewardSources, collectRewardSources, isAssetHubChain };

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
        id
        address
        amount
        timestamp
        blockNumber
        type
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
      id: string;
      address: string;
      amount: string;
      timestamp: string;
      blockNumber: number;
      type: string;
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
            id: node.id,
            address: node.address,
            amount: node.amount,
            timestamp: Number(node.timestamp),
            blockNumber: Number(node.blockNumber),
            type: node.type,
          });
        }
      } catch (error) {
        console.error('Staking: monthly rewards request failed for', url, error);
      }
    }),
  );

  return allRecords;
};
