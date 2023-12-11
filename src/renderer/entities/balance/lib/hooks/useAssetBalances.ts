import { useUnit } from 'effector-react';

import { AccountId, Balance, ChainId } from '@shared/core';
import { balanceModel } from '../../model/balance-model';
import { balanceUtils } from '../common/utils';

type Props = {
  chainId: ChainId;
  accountIds: AccountId[];
  assetId: string;
};
export const useAssetBalances = ({ chainId, accountIds, assetId }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balances);

  return balanceUtils.getAssetBalances(balances, accountIds, chainId, assetId);
};
