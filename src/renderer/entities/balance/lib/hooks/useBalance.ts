import { AccountId, Balance, ChainId } from '@shared/core';
import { useAssetBalances } from './useAssetBalances';

type Props = {
  chainId: ChainId;
  accountId: AccountId;
  assetId: string;
};
export const useBalance = ({ chainId, accountId, assetId }: Props): Balance | undefined => {
  return useAssetBalances({ chainId, accountIds: [accountId], assetId })[0];
};
