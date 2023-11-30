import { useUnit } from 'effector-react';

import { AccountId, Balance } from '@shared/core';
import { balanceModel } from '../../model/balance-model';

type Props = {
  accountIds: AccountId[];
};
export const useAccountsBalances = ({ accountIds }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balances);

  return balances.filter((balance) => accountIds.includes(balance.accountId));
};
