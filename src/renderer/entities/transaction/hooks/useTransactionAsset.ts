import { useStoreMap } from 'effector-react';

import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';

export const useTransactionAsset = (operation: MultisigOperation) => {
  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [operation.chainId],
    fn: (chains, [id]) => chains[id] ?? null,
  });
  const api = useStoreMap({
    store: networkModel.$apis,
    keys: [operation.chainId],
    fn: (apis, [id]) => apis[id] ?? null,
  });

  if (operation.transaction && chain) {
    if (operation.transaction.args.assetId) {
      const targetAssetId = operation.transaction.args.assetId;

      const foundAsset = chain.assets.find((asset) => {
        return asset.typeExtras && 'assetId' in asset.typeExtras && asset.typeExtras.assetId === targetAssetId;
      });

      if (foundAsset) {
        return foundAsset;
      }

      if (api) {
        return getAssetByTypeExtras(api, chain.assets, targetAssetId);
      }

      return null;
    } else {
      return getAssetById(operation.transaction.args.asset, chain.assets) ?? null;
    }
  }

  return null;
};
