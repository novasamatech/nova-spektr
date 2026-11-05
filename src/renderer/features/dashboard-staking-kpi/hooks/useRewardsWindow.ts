import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type DataCompleteness,
  type StakingRewardsParams,
  rewards,
  rewardsCacheKey,
  rewardsService,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';

import { useResourcePool } from './useResourcePool';

const { stakingRewardsResource } = rewards;

/** The card's window: rewards of the last 30 days. */
export const REWARDS_WINDOW_DAYS = 30;

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Anchored to UTC midnight rather than "now": the timestamp is part of the
 * cache key, so a moving anchor would refetch the whole window on every mount.
 */
export function useRewardsWindowStart(days = REWARDS_WINDOW_DAYS, now = Date.now()): number {
  const midnight = Math.floor(now / 1000 / DAY_SECONDS) * DAY_SECONDS;

  return useMemo(() => midnight - days * DAY_SECONDS, [midnight, days]);
}

export type ChainRewards = Record<ChainId, Record<AccountId, string>>;

/** How far the window of each chain that has answered can be trusted. */
export type ChainRewardsCompleteness = Record<ChainId, DataCompleteness>;

/**
 * Rewards earned in the window, per chain and account. Multi-chain by
 * construction: `useStakingRewards` drives exactly one chain, and the row needs
 * every staking chain the running config knows about.
 *
 * `completeness` travels with the figures: a chain whose sources did not all
 * answer holds a lower bound, and one none of them answered for holds
 * placeholder zeroes that must not be read as "earned nothing". A chain with no
 * reward source counts as `unavailable`; a chain still in flight has no entry.
 */
export const useRewardsWindow = (
  chainIds: ChainId[],
  accountIds: AccountId[],
  since: number,
): { byChain: ChainRewards; completeness: ChainRewardsCompleteness } => {
  const chains = useUnit(networkModel.$chains);

  const requests = useMemo(() => {
    if (accountIds.length === 0) return [];

    const result: StakingRewardsParams[] = [];

    for (const chainId of chainIds) {
      const chain = chains[chainId];
      if (!chain) continue;

      // The row iterates whatever staking chains the config knows about, so the
      // chain here may be a relay whose stake now lives on its Asset Hub.
      const rewardSources = rewardsService.collectChainRewardSources(chain, chains, 'chain-family');
      if (rewardSources.length === 0) continue;

      result.push({ chainId, accounts: accountIds, rewardSources, since });
    }

    return result;
  }, [chainIds, accountIds, chains, since]);

  useResourcePool(stakingRewardsResource, requests);

  const cache = useUnit(stakingRewardsResource.$cache);

  return useMemo(() => {
    const byChain: ChainRewards = {};
    const completeness: ChainRewardsCompleteness = {};

    const requested = new Set(requests.map((request) => request.chainId));

    for (const chainId of chainIds) {
      // Nobody to ask about: nothing was earned, and that is known.
      if (accountIds.length === 0) {
        byChain[chainId] = {};
        completeness[chainId] = 'complete';
        continue;
      }

      // A chain with no reward source to ask is never requested. Its rewards are
      // unknown, not zero, and must not drop out of the figure unnoticed.
      if (!requested.has(chainId)) {
        completeness[chainId] = 'unavailable';
        continue;
      }

      // Keyed by the account set too, so a hit is an answer about exactly these
      // accounts. Reading a chain+window-only entry used to hand back a settled
      // `0` for an account that was simply not part of the cached request.
      const cached = cache[rewardsCacheKey(chainId, accountIds, since)];
      if (!cached) continue;

      const scoped: Record<AccountId, string> = {};
      for (const accountId of accountIds) {
        scoped[accountId] = cached.rewards[accountId] ?? '0';
      }

      byChain[chainId] = scoped;
      completeness[chainId] = cached.completeness;
    }

    return { byChain, completeness };
  }, [chainIds, accountIds, requests, cache, since]);
};
