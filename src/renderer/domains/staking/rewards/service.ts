import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';

import { keys, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type RewardSource, type RewardsMap } from '../_lib/types';

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

export const stakingRewardsApi = {
  fetch: fetchStakingRewards,
};
