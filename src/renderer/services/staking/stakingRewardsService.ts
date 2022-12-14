import { useQuery } from '@apollo/client';

import { AccountID } from '@renderer/domain/shared-kernel';
import { GET_TOTAL_REWARDS } from '@renderer/graphql/queries/stakingRewards';
import { RewardsQuery } from '@renderer/graphql/types/stakingRewards';
import { toAddress } from '@renderer/services/balance/common/utils';
import { IStakingRewardsService, RewardsMap } from '@renderer/services/staking/common/types';
import { toPublicKey } from '@renderer/utils/address';

export const useStakingRewards = (accounts: AccountID[], addressPrefix: number): IStakingRewardsService => {
  const accountsWithPrefix = (accounts: AccountID[], addressPrefix: number): AccountID[] => {
    return accounts.reduce((acc, account) => {
      const publicKey = toPublicKey(account);

      return !publicKey ? acc : acc.concat(toAddress(publicKey, addressPrefix));
    }, [] as AccountID[]);
  };

  const { data, loading } = useQuery<RewardsQuery>(GET_TOTAL_REWARDS, {
    variables: {
      addresses: accounts.length === 0 ? [''] : accountsWithPrefix(accounts, addressPrefix),
    },
  });

  const rewards = data?.accumulatedRewards.nodes.reduce<RewardsMap>((acc, node) => {
    return { ...acc, [node.id]: node.amount };
  }, {});

  return {
    rewards: rewards || {},
    isLoading: loading,
  };
};
