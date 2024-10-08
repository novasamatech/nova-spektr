import { type AccountId, type Balance, type ChainId } from '@shared/core';

import { useAssetBalances } from './useAssetBalances';

type Props = {
  chainId: ChainId;
  accountId: AccountId;
  assetId: string;
};
export const useBalance = ({ chainId, accountId, assetId }: Props): Balance | undefined => {
  const rest = useAssetBalances({ chainId, accountIds: [accountId], assetId });
  console.log('rest', rest);

  return rest[0];
};
