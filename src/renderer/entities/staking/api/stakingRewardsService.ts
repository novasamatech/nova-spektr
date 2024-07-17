import { useQuery } from '@apollo/client';

import { GET_TOTAL_REWARDS } from '../graphql/queries/stakingRewards';
import { type RewardsQuery } from '../graphql/types/stakingRewards';
import { type IStakingRewardsService, type RewardsMap } from '../lib/types';
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
