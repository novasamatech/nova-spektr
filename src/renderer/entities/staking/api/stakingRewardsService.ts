import { BN } from '@polkadot/util';
import { GraphQLClient } from 'graphql-request';

import { keys, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { GET_TOTAL_REWARDS } from '../graphql/queries/stakingRewards';
import { type RewardsQuery } from '../graphql/types/stakingRewards';
import { type RewardSource } from '../lib/staking-utils';
import { type RewardsMap } from '../lib/types';

type FetchStakingRewardsParams = {
  accounts: AccountId[];
  rewardSources: RewardSource[];
  baseMap: RewardsMap;
};

export const fetchStakingRewards = async ({
  accounts,
  rewardSources,
  baseMap,
}: FetchStakingRewardsParams): Promise<RewardsMap> => {
  if (accounts.length === 0 || rewardSources.length === 0) {
    return baseMap;
  }

  const buildAddresses = (prefix: number) => {
    return accounts.map((accountId) => toAddress(accountId, { prefix }));
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

        const data = await client.request<RewardsQuery>(GET_TOTAL_REWARDS, {
          addresses: buildAddresses(addressPrefix),
        });

        const nodes = data.accumulatedRewards?.nodes ?? [];

        for (const { id, amount } of nodes) {
          const accountId = toAccountId(id);
          if (!sums[accountId]) {
            sums[accountId] = new BN(0);
          }

          sums[accountId] = sums[accountId]!.add(new BN(amount));
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
