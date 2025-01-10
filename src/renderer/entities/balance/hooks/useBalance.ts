import { type Balance, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { useAssetBalances } from './useAssetBalances';

type Props = {
  chainId: ChainId;
  accountId: AccountId;
  assetId: string;
};
export const useBalance = ({ chainId, accountId, assetId }: Props): Balance | undefined => {
  return useAssetBalances({ chainId, accountIds: [accountId], assetId })[0];
};
