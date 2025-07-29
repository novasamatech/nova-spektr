import { type Asset, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { useAssetBalances } from './useAssetBalances';

type Props = {
  chainId: ChainId;
  accountId: AccountId;
  assetId: Asset['assetId'];
};
export const useBalance = ({ chainId, accountId, assetId }: Props) => {
  return useAssetBalances({ chainId, accountIds: [accountId], assetId }).at(0);
};
