import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { type MonthlyRewardRecord, type RewardSource, type RewardsMap } from '../types';

import { fetchMonthlyRewards, fetchStakingRewards } from './service';

export type StakingRewardsParams = {
  chainId: ChainId;
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since?: number;
};

/**
 * Keyed by the account set as well as the window, mirroring the resource key.
 *
 * A chain+window key alone is shared by every account selection on that chain,
 * so changing the selection starts a refetch while the cache still holds the
 * previous set's map — and a consumer reading it back sees a settled `0` for an
 * account that simply was not in that request.
 */
export function rewardsCacheKey(chainId: ChainId, accounts: AccountId[], since?: number): string {
  return `${chainId}-${[...accounts].sort().join('_')}-${since ?? 'all'}`;
}

export function monthlyCacheKey(chainId: ChainId, accounts: AccountId[]): string {
  return `${chainId}-${accounts.join(',')}`;
}

const $rewardsCache = createStore<Record<string, RewardsMap>>({});

export type MonthlyRewardsParams = {
  chainId: ChainId;
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since: number;
};

const $monthlyRewardsCache = createStore<Record<string, MonthlyRewardRecord[]>>({});

export const monthlyRewardsResource = createQueryResource<MonthlyRewardsParams>({
  key: ({ chainId, accounts }) => [chainId, ...accounts, 'monthly'],
})
  .name('monthly-rewards')
  .request<MonthlyRewardRecord[]>(({ accounts, rewardSources, since }) => {
    return fetchMonthlyRewards({ accounts, rewardSources, since });
  })
  .cache({
    store: $monthlyRewardsCache,
    map: (state, records, { chainId, accounts }) => ({
      ...state,
      [monthlyCacheKey(chainId, accounts)]: records,
    }),
    staleAfter: 10 * 60 * 1000,
  })
  .build();

export const stakingRewardsResource = createQueryResource<StakingRewardsParams>({
  key: ({ chainId, accounts, since }) => [chainId, ...accounts, since ?? 'all'],
})
  .name('staking-rewards')
  .request<RewardsMap>(({ accounts, rewardSources, since }) => {
    const baseMap = accounts.reduce<RewardsMap>((acc, account) => {
      acc[account] = '0';

      return acc;
    }, {});

    return fetchStakingRewards({ accounts, rewardSources, baseMap, since });
  })
  .cache({
    store: $rewardsCache,
    map: (state, rewards, { chainId, accounts, since }) => ({
      ...state,
      [rewardsCacheKey(chainId, accounts, since)]: rewards,
    }),
    staleAfter: 10 * 60 * 1000,
  })
  .build();
