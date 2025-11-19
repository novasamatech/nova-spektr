import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, ExternalType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { stakingRewardsApi } from '../api/stakingRewardsService';
import { type RewardSource, stakingUtils } from '../lib/staking-utils';
import { type IStakingRewardsService, type RewardsMap } from '../lib/types';

export const useStakingRewards = (accounts: AccountId[], chain: Chain | null): IStakingRewardsService => {
  const chainsMap = useUnit(networkModel.$chains);

  const emptyMap = useMemo<RewardsMap>(() => {
    return accounts.reduce<RewardsMap>((acc, account) => {
      acc[account] = '0';

      return acc;
    }, {});
  }, [accounts]);

  const [rewards, setRewards] = useState<RewardsMap>(emptyMap);
  const [isRewardsLoading, setRewardsLoading] = useState(false);

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

  useEffect(() => {
    setRewards(emptyMap);
  }, [emptyMap]);

  useEffect(() => {
    if (accounts.length === 0 || rewardSources.length === 0) {
      setRewardsLoading(false);
      setRewards(emptyMap);
      return;
    }

    setRewardsLoading(true);

    stakingRewardsApi
      .fetch({
        accounts,
        rewardSources,
        baseMap: emptyMap,
      })
      .then((aggregated) => {
        setRewards(aggregated);
        setRewardsLoading(false);
      })
      .catch((error) => {
        console.error('Staking: failed to fetch rewards', error);

        setRewards(emptyMap);
        setRewardsLoading(false);
      });
  }, [accounts, emptyMap, rewardSources]);

  return {
    rewards,
    isRewardsLoading,
  };
};
