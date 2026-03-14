import { useMemo } from 'react';

import { type Chain, type ChainId, ExternalType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';
import { stakingUtils } from '../_lib/helpers';
import { type RewardSource, type RewardsMap } from '../_lib/types';

import { type StakingRewardsParams, stakingRewardsResource } from './resource';

const EMPTY_MAP: RewardsMap = {};

export const useStakingRewards = (accounts: AccountId[], chain: Chain | null, chainsMap: Record<ChainId, Chain>) => {
  const rewardSources = useMemo<RewardSource[]>(() => {
    if (!chain) return [];

    const uniqueSources = new Map<string, RewardSource>();

    stakingUtils.collectRewardSources(chain, ExternalType.STAKING, uniqueSources);

    if (stakingUtils.isAssetHubChain(chain)) {
      stakingUtils.collectRewardSources(chain, ExternalType.HISTORY, uniqueSources);

      if (chain.parentId) {
        stakingUtils.collectRewardSources(chainsMap[chain.parentId], ExternalType.STAKING, uniqueSources);
      }
    }

    for (const candidate of Object.values(chainsMap)) {
      if (candidate.parentId !== chain.chainId) continue;

      if (!stakingUtils.isAssetHubChain(candidate)) continue;

      stakingUtils.collectRewardSources(candidate, ExternalType.HISTORY, uniqueSources);
    }

    return Array.from(uniqueSources.values());
  }, [chain, chainsMap]);

  const params = useMemo<StakingRewardsParams | null>(() => {
    if (!chain || accounts.length === 0 || rewardSources.length === 0) return null;

    return { chainId: chain.chainId, accounts, rewardSources };
  }, [chain, accounts, rewardSources]);

  const { data: rewards, pending: isRewardsLoading } = useResource(stakingRewardsResource, {
    params,
    defaultValue: EMPTY_MAP,
    map: (cache: Record<ChainId, RewardsMap>, p: StakingRewardsParams) => {
      const cached = cache[p.chainId];
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
