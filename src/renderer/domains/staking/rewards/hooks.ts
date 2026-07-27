import { useMemo } from 'react';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';
import { type MonthlyRewardRecord, type RewardSource, type RewardsMap } from '../types';

import {
  type MonthlyRewardsParams,
  type StakingRewardsParams,
  monthlyCacheKey,
  monthlyRewardsResource,
  rewardsCacheKey,
  stakingRewardsResource,
} from './resource';
import { collectRewardSources, isAssetHubChain } from './service';

const EMPTY_MAP: RewardsMap = {};
const EMPTY_RECORDS: MonthlyRewardRecord[] = [];

/**
 * The subquery endpoints a chain's rewards can be read from — an Asset Hub also
 * inherits its relay chain's staking indexer, which is where pre-migration
 * history lives.
 */
export const useRewardSources = (chain: Chain | null, chainsMap: Record<ChainId, Chain>): RewardSource[] => {
  return useMemo<RewardSource[]>(() => {
    if (!chain) return [];

    const uniqueSources = new Map<string, RewardSource>();

    collectRewardSources(chain, ExternalType.STAKING, uniqueSources);

    if (isAssetHubChain(chain)) {
      collectRewardSources(chain, ExternalType.HISTORY, uniqueSources);

      if (chain.parentId) {
        collectRewardSources(chainsMap[chain.parentId], ExternalType.STAKING, uniqueSources);
      }
    }

    for (const candidate of Object.values(chainsMap)) {
      if (candidate.parentId !== chain.chainId) continue;

      if (!isAssetHubChain(candidate)) continue;

      collectRewardSources(candidate, ExternalType.HISTORY, uniqueSources);
    }

    return Array.from(uniqueSources.values());
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

  const { data: rewards, pending: isRewardsLoading } = useResource(stakingRewardsResource, {
    params,
    defaultValue: EMPTY_MAP,
    map: (cache: Record<string, RewardsMap>, p: StakingRewardsParams) => {
      const cached = cache[rewardsCacheKey(p.chainId, p.since)];
      if (!cached) return undefined;

      const merged: RewardsMap = {};
      for (const account of p.accounts) {
        merged[account] = cached[account] ?? '0';
      }

      return merged;
    },
  });

  return { data: rewards, pending: isRewardsLoading };
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

  const { data: records, pending } = useResource(monthlyRewardsResource, {
    params,
    defaultValue: EMPTY_RECORDS,
    map: (cache: Record<string, MonthlyRewardRecord[]>, p: MonthlyRewardsParams) => {
      return cache[monthlyCacheKey(p.chainId, p.accounts)];
    },
  });

  return { data: records, pending };
};
