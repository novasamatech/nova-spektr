import { useStoreMap } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { type AnyTransaction } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

import { useDecodedTransaction } from './useDecodedTransaction';

export const useTransactionAsset = (transaction: AnyTransaction | null, chainId: ChainId) => {
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

  const decodedTransaction = useDecodedTransaction(transaction, chain.chainId);

  if (decodedTransaction && chain) {
    const assetId = operationDetailsUtils.getAssetId(decodedTransaction);
    const asset = operationDetailsUtils.getAsset(decodedTransaction);

    if (assetId && api) {
      return getAssetByTypeExtras(api, chain.assets, assetId);
    }

    if (asset) {
      return getAssetById(asset, chain?.assets) ?? null;
    }
  }

  return null;
};
