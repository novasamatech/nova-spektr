import { useStoreMap } from 'effector-react';

import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { type MultisigOperation } from '@/domains/multisig';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

export const useTransactionAsset = (operation: MultisigOperation) => {
  const transaction = operationDetailsUtils.getOperationData(operation);
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

  if (transaction && chain) {
    if (transaction.args?.assetId && api) {
      return getAssetByTypeExtras(api, chain.assets, transaction.args?.assetId);
    } else {
      return getAssetById(transaction.args?.asset, chain?.assets) ?? null;
    }
  }

  return null;
};
