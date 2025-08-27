import { useQuery } from '@apollo/client';

import { type Chain } from '@/shared/core';
import { toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { GET_TOTAL_REWARDS } from '../graphql/queries/stakingRewards';
import { type RewardsQuery } from '../graphql/types/stakingRewards';
import { type IStakingRewardsService, type RewardsMap } from '../lib/types';

export const useStakingRewards = (accounts: AccountId[], chain: Chain | null): IStakingRewardsService => {
  const { data, loading } = useQuery<RewardsQuery>(GET_TOTAL_REWARDS, {
    variables: {
      addresses: accounts.length === 0 ? [''] : accounts.map((a) => toAddress(a, { prefix: chain?.addressPrefix })),
    },
  });

  const addressMap = accounts.reduce<RewardsMap>((acc, account) => {
    acc[account] = '0';

    return acc;
  }, {});

  const rewards = data?.accumulatedRewards.nodes.reduce<RewardsMap>((acc, node) => {
    acc[toAccountId(node.id)] = node.amount;

    return acc;
  }, addressMap);

  return {
    rewards: rewards || addressMap,
    isRewardsLoading: loading,
  };
};
