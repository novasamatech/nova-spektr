import { useQuery } from '@apollo/client';

import { Address } from '@renderer/domain/shared-kernel';
import { GET_TOTAL_REWARDS } from '@renderer/graphql/queries/stakingRewards';
import { RewardsQuery } from '@renderer/graphql/types/stakingRewards';
import { IStakingRewardsService, RewardsMap } from '@renderer/services/staking/common/types';
import { toAddress } from '@renderer/shared/utils/address';

export const useStakingRewards = (addresses: Address[], addressPrefix?: number): IStakingRewardsService => {
  const accountsWithPrefix = addresses.map((address) => toAddress(address, { prefix: addressPrefix }));

  const { data, loading } = useQuery<RewardsQuery>(GET_TOTAL_REWARDS, {
    variables: {
      addresses: addresses.length > 0 ? accountsWithPrefix : [''],
    },
  });

  const addressMap = addresses.reduce<RewardsMap>((acc, account) => {
    return { ...acc, [account]: '0' };
  }, {});

  const rewards = data?.accumulatedRewards.nodes.reduce<RewardsMap>((acc, node) => {
    const originalAddress = addresses[accountsWithPrefix.indexOf(node.id)];

    return { ...acc, [originalAddress]: node.amount };
  }, addressMap);

  return {
    rewards: rewards || addressMap,
    isLoading: loading,
  };
};
