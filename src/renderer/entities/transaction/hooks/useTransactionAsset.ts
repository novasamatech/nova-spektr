import { useStoreMap } from 'effector-react';

import { type Asset, type ChainId, type DecodedTransaction } from '@/shared/core';
import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '../lib/common/utils';

export const useTransactionAsset = (transaction: DecodedTransaction | null, chainId: ChainId): Asset | null => {
  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [chainId],
    fn: (chains, [id]) => chains[id] ?? null,
  });
  const api = useStoreMap({
    store: networkModel.$apis,
    keys: [chainId],
    fn: (apis, [id]) => apis[id] ?? null,
  });

  const coreTx = findCoreTransaction(transaction);

  if (coreTx && chain) {
    if (coreTx.args.assetId) {
      const targetAssetId: string = coreTx.args.assetId;

      const foundAsset = api && getAssetByTypeExtras(api, chain.assets, targetAssetId);
      if (foundAsset) {
        return foundAsset;
      }

      return getAssetById(coreTx.args.assetId, chain.assets) ?? null;
    }
  }

  return null;
};
