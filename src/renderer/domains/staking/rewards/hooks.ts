import { useMemo } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';
import { type DataCompleteness } from '../completeness';
import { type MonthlyRewards, type RewardSource, type RewardsMap, type StakingRewards } from '../types';

import {
  type MonthlyRewardsParams,
  type StakingRewardsParams,
  monthlyCacheKey,
  monthlyRewardsResource,
  rewardsCacheKey,
  stakingRewardsResource,
} from './resource';
import { collectChainRewardSources } from './service';

const EMPTY_REWARDS: StakingRewards = { rewards: {}, completeness: 'unavailable' };
const EMPTY_MONTHLY: MonthlyRewards = { records: [], completeness: 'unavailable' };

/**
 * What can be said while nothing is requested: with no account there is nothing
 * to ask and "no rewards" is true; with accounts but no chain or no source to
 * ask, their rewards are simply unknown.
 */
function idleCompleteness(accounts: AccountId[]): DataCompleteness {
  return accounts.length === 0 ? 'complete' : 'unavailable';
}

/**
 * The subquery endpoints a chain's rewards can be read from — an Asset Hub also
 * inherits its relay chain's staking indexer, which is where pre-migration
 * history lives.
 */
export const useRewardSources = (chain: Chain | null, chainsMap: Record<ChainId, Chain>): RewardSource[] => {
  return useMemo<RewardSource[]>(() => {
    if (!chain) return [];

    return collectChainRewardSources(chain, chainsMap, 'chain-family');
  }, [chain, chainsMap]);
};

export const useStakingRewards = (
  accounts: AccountId[],
  chain: Chain | null,
  chainsMap: Record<ChainId, Chain>,
  since?: number,
) => {
  const rewardSources = useRewardSources(chain, chainsMap);

  const params = useMemo<StakingRewardsParams | null>(() => {
    if (!chain || accounts.length === 0 || rewardSources.length === 0) return null;

    return { chainId: chain.chainId, accounts, rewardSources, since };
  }, [chain, accounts, rewardSources, since]);

  const { data, pending } = useResource(stakingRewardsResource, {
    params,
    defaultValue: EMPTY_REWARDS,
    map: (cache: Record<string, StakingRewards>, p: StakingRewardsParams) => {
      // The key covers the account set, so a hit answers for exactly these
      // accounts - `?? '0'` is now only the service's own "nothing earned".
      const cached = cache[rewardsCacheKey(p.chainId, p.accounts, p.since)];
      if (!cached) return undefined;

      const merged: RewardsMap = {};
      for (const account of p.accounts) {
        merged[account] = cached.rewards[account] ?? '0';
      }

      return { rewards: merged, completeness: cached.completeness };
    },
  });

  return {
    data: data.rewards,
    /**
     * Only `complete` makes a `'0'` mean "earned nothing": a `partial` figure
     * is a lower bound and an `unavailable` one could not be loaded at all.
     */
    completeness: params ? data.completeness : idleCompleteness(accounts),
    pending,
  };
};

export const useMonthlyRewards = (accounts: AccountId[], chain: Chain | null, chainsMap: Record<ChainId, Chain>) => {
  const rewardSources = useRewardSources(chain, chainsMap);

  const since = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);

    return Math.floor(d.getTime() / 1000);
  }, []);

  const params = useMemo<MonthlyRewardsParams | null>(() => {
    if (!chain || accounts.length === 0 || rewardSources.length === 0) return null;

    return { chainId: chain.chainId, accounts, rewardSources, since };
  }, [chain, accounts, rewardSources, since]);

  const { data, pending } = useResource(monthlyRewardsResource, {
    params,
    defaultValue: EMPTY_MONTHLY,
    map: (cache: Record<string, MonthlyRewards>, p: MonthlyRewardsParams) => {
      return cache[monthlyCacheKey(p.chainId, p.accounts)];
    },
  });

  return {
    data: data.records,
    /**
     * Only `complete` makes an empty list mean "nothing was paid": a `partial`
     * list is missing a source's rows and an `unavailable` one says nothing.
     */
    completeness: params ? data.completeness : idleCompleteness(accounts),
    pending,
  };
};
