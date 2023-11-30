import { useUnit } from 'effector-react';

import { AccountId, Balance, ChainId } from '@shared/core';
import { balanceModel } from '../../model/balance-model';

type Props = {
  chainId: ChainId;
  accountIds: AccountId[];
  assetId: string;
};
export const useAssetBalances = ({ chainId, accountIds, assetId }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balances);

  return balances.filter(
    (balance) => accountIds.includes(balance.accountId) && balance.chainId === chainId && balance.assetId === assetId,
  );
};
