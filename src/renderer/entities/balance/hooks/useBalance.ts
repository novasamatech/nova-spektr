import { useUnit } from 'effector-react';

import { type AssetId, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '../lib/balance-utils';
import { balanceModel } from '../model/balance-model';

type Props = {
  chainId: ChainId;
  accountId: AccountId;
  assetId: AssetId;
};
export const useBalance = ({ chainId, accountId, assetId }: Props) => {
  const balances = useUnit(balanceModel.$balanceMap);

  return balanceUtils.getBalance(balances, accountId, chainId, assetId);
};
