import { useMemo } from 'react';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';
import { type RewardSource, type RewardsMap } from '../types';

import { type StakingRewardsParams, rewardsCacheKey, stakingRewardsResource } from './resource';
import { collectRewardSources, isAssetHubChain } from './service';

const EMPTY_MAP: RewardsMap = {};

export const useStakingRewards = (
  accounts: AccountId[],
  chain: Chain | null,
  chainsMap: Record<ChainId, Chain>,
  since?: number,
) => {
  const rewardSources = useMemo<RewardSource[]>(() => {
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
