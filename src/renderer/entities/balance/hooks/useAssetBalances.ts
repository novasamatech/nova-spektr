import { useUnit } from 'effector-react';

import { type AssetId, type Balance, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '../lib/balance-utils';
import { balanceModel } from '../model/balance-model';

type Props = {
  chainId: ChainId;
  accountIds: AccountId[];
  assetId: AssetId;
};
export const useAssetBalances = ({ chainId, accountIds, assetId }: Props): Balance[] => {
  const balances = useUnit(balanceModel.$balanceMap);

  return balanceUtils.getAssetBalances(balances, accountIds, chainId, assetId);
};
