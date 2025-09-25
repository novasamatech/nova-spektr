import { useStoreMap } from 'effector-react';

import { type ChainId, type DecodedTransaction } from '@/shared/core';
import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { findCoreTransaction } from '../lib/common/utils';

export const useTransactionAsset = (transaction: DecodedTransaction | null, chainId: ChainId) => {
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

      const foundAsset = chain.assets.find((asset) => {
        return asset.typeExtras && 'assetId' in asset.typeExtras && asset.typeExtras.assetId === targetAssetId;
      });

      if (foundAsset) {
        return foundAsset;
      }

      const assetByTypeExtras = api && getAssetByTypeExtras(api, chain.assets, targetAssetId);
      if (assetByTypeExtras) {
        return assetByTypeExtras;
      }

      return getAssetById(coreTx.args.assetId, chain.assets) ?? null;
    }

    return getAssetById(coreTx.args.asset, chain.assets) ?? null;
  }

  return null;
};
