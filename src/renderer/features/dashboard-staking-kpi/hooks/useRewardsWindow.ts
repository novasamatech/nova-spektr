import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type RewardSource,
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

function collectSources(chain: Chain, chainsMap: Record<ChainId, Chain>): RewardSource[] {
  const unique = new Map<string, RewardSource>();

  rewardsService.collectRewardSources(chain, ExternalType.STAKING, unique);

  if (rewardsService.isAssetHubChain(chain)) {
    rewardsService.collectRewardSources(chain, ExternalType.HISTORY, unique);

    if (chain.parentId) {
      rewardsService.collectRewardSources(chainsMap[chain.parentId], ExternalType.STAKING, unique);
    }
  }

  for (const candidate of Object.values(chainsMap)) {
    if (candidate.parentId !== chain.chainId) continue;
    if (!rewardsService.isAssetHubChain(candidate)) continue;

    rewardsService.collectRewardSources(candidate, ExternalType.HISTORY, unique);
  }

  return [...unique.values()];
}

export type ChainRewards = Record<ChainId, Record<AccountId, string>>;

/**
 * Rewards earned in the window, per chain and account. Multi-chain by
 * construction: `useStakingRewards` drives exactly one chain, and the row needs
 * every staking chain the running config knows about.
 */
export const useRewardsWindow = (
  chainIds: ChainId[],
  accountIds: AccountId[],
  since: number,
): { byChain: ChainRewards } => {
  const chains = useUnit(networkModel.$chains);

  const requests = useMemo(() => {
    if (accountIds.length === 0) return [];

    const result: StakingRewardsParams[] = [];

    for (const chainId of chainIds) {
      const chain = chains[chainId];
      if (!chain) continue;

      const rewardSources = collectSources(chain, chains);
      if (rewardSources.length === 0) continue;

      result.push({ chainId, accounts: accountIds, rewardSources, since });
    }

    return result;
  }, [chainIds, accountIds, chains, since]);

  useResourcePool(stakingRewardsResource, requests);

  const cache = useUnit(stakingRewardsResource.$cache);

  const byChain = useMemo(() => {
    const result: ChainRewards = {};

    for (const chainId of chainIds) {
      // Keyed by the account set too, so a hit is an answer about exactly these
      // accounts. Reading a chain+window-only entry used to hand back a settled
      // `0` for an account that was simply not part of the cached request.
      const cached = cache[rewardsCacheKey(chainId, accountIds, since)];
      if (!cached) continue;

      const scoped: Record<AccountId, string> = {};
      for (const accountId of accountIds) {
        scoped[accountId] = cached[accountId] ?? '0';
      }

      result[chainId] = scoped;
    }

    return result;
  }, [chainIds, accountIds, cache, since]);

  return { byChain };
};
