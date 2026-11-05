import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { type DataCompleteness, INCOMPLETE_STALE_AFTER } from '../completeness';
import { type MonthlyRewards, type RewardSource, type RewardsMap, type StakingRewards } from '../types';

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

const $rewardsCache = createStore<Record<string, StakingRewards>>({});

/** How long a complete answer is reused. */
export const REWARDS_STALE_AFTER = 10 * 60 * 1000;

/**
 * An answer that is not complete is kept only briefly, so the next request asks
 * the sources again instead of repeating a failed read for the whole window.
 */
const staleAfter = ({ completeness }: { completeness: DataCompleteness }) =>
  completeness === 'complete' ? REWARDS_STALE_AFTER : INCOMPLETE_STALE_AFTER;

export type MonthlyRewardsParams = {
  chainId: ChainId;
  accounts: AccountId[];
  rewardSources: RewardSource[];
  since: number;
};

const $monthlyRewardsCache = createStore<Record<string, MonthlyRewards>>({});

export const monthlyRewardsResource = createQueryResource<MonthlyRewardsParams>({
  key: ({ chainId, accounts }) => [chainId, ...accounts, 'monthly'],
})
  .name('monthly-rewards')
  .request<MonthlyRewards>(({ accounts, rewardSources, since }) => {
    return fetchMonthlyRewards({ accounts, rewardSources, since });
  })
  .cache({
    store: $monthlyRewardsCache,
    map: (state, monthly, { chainId, accounts }) => ({
      ...state,
      [monthlyCacheKey(chainId, accounts)]: monthly,
    }),
    staleAfter,
  })
  .build();

export const stakingRewardsResource = createQueryResource<StakingRewardsParams>({
  key: ({ chainId, accounts, since }) => [chainId, ...accounts, since ?? 'all'],
})
  .name('staking-rewards')
  .request<StakingRewards>(({ accounts, rewardSources, since }) => {
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
    staleAfter,
  })
  .build();
