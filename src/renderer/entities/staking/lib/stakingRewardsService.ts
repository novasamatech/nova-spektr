import { useQuery } from '@apollo/client';

import { GET_TOTAL_REWARDS } from '@renderer/graphql/queries/stakingRewards';
import { RewardsQuery } from '@renderer/graphql/types/stakingRewards';
import { IStakingRewardsService, RewardsMap } from '@entities/staking';
import type { Address } from '@shared/core';

export const useStakingRewards = (addresses: Address[]): IStakingRewardsService => {
  const { data, loading } = useQuery<RewardsQuery>(GET_TOTAL_REWARDS, {
    variables: {
      addresses: addresses.length === 0 ? [''] : addresses,
    },
  });

  const addressMap = addresses.reduce<RewardsMap>((acc, account) => {
    acc[account] = '0';

    return acc;
  }, {});

  const rewards = data?.accumulatedRewards.nodes.reduce<RewardsMap>((acc, node) => {
    acc[node.id] = node.amount;

    return acc;
  }, addressMap);

  return {
    rewards: rewards || addressMap,
    isRewardsLoading: loading,
  };
};
