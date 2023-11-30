import { useUnit } from 'effector-react';

import { AccountId, Balance, ChainId } from '@shared/core';
import { balanceModel } from '../../model/balance-model';

type Props = {
  chainId: ChainId;
  accountIds: AccountId[];
};
export const useNetworkBalances = ({ chainId, accountIds }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balances);

  return balances.filter((balance) => accountIds.includes(balance.accountId) && balance.chainId === chainId);
};
