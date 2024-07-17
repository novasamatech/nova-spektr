import { useUnit } from 'effector-react';

import { type AccountId, type Balance, type ChainId } from '@shared/core';

import { balanceUtils } from '../lib/balance-utils';
import { balanceModel } from '../model/balance-model';

type Props = {
  chainId: ChainId;
  accountIds: AccountId[];
  assetId: string;
};
export const useAssetBalances = ({ chainId, accountIds, assetId }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balances);

  return balanceUtils.getAssetBalances(balances, accountIds, chainId, assetId);
};
