import { useUnit } from 'effector-react';

import { AccountId, Balance } from '@shared/core';
import { balanceModel } from '../../model/balance-model';
import { balanceUtils } from '../common/utils';

type Props = {
  accountIds: AccountId[];
};
export const useAccountsBalances = ({ accountIds }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balances);

  return balanceUtils.getAccountsBalances(balances, accountIds);
};
