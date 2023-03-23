import { useQuery } from '@apollo/client';

import { AccountID } from '@renderer/domain/shared-kernel';
import { GET_TOTAL_REWARDS } from '@renderer/graphql/queries/stakingRewards';
import { RewardsQuery } from '@renderer/graphql/types/stakingRewards';
import { IStakingRewardsService, RewardsMap } from '@renderer/services/staking/common/types';
import { formatAddress, toPublicKey } from '@renderer/shared/utils/address';

const getAccountsWithPrefix = (accounts: AccountID[], addressPrefix?: number): AccountID[] => {
  return accounts.reduce<AccountID[]>((acc, account) => {
    const publicKey = toPublicKey(account);

    return publicKey ? acc.concat(formatAddress(publicKey, addressPrefix)) : acc;
  }, []);
};

export const useStakingRewards = (accounts: AccountID[], addressPrefix?: number): IStakingRewardsService => {
  const accountsWithPrefix = getAccountsWithPrefix(accounts, addressPrefix);

  const { data, loading } = useQuery<RewardsQuery>(GET_TOTAL_REWARDS, {
    variables: {
      addresses: accounts.length > 0 ? accountsWithPrefix : [''],
    },
  });

  const accountsMap = accounts.reduce<RewardsMap>((acc, account) => {
    return { ...acc, [account]: '0' };
  }, {});

  const rewards = data?.accumulatedRewards.nodes.reduce<RewardsMap>((acc, node) => {
    const originalAddress = accounts[accountsWithPrefix.indexOf(node.id)];

    return { ...acc, [originalAddress]: node.amount };
  }, accountsMap);

  return {
    rewards: rewards || accountsMap,
    isLoading: loading,
  };
};
