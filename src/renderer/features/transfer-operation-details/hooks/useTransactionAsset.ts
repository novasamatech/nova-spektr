import { useStoreMap } from 'effector-react';

import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';

export const useTransactionAsset = (operation: MultisigTransactionDS | FlexibleMultisigTransactionDS) => {
  const transaction = getTransactionFromMultisigTx(operation);
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
    if (transaction.args.assetId && api) {
      return getAssetByTypeExtras(api, chain.assets, transaction.args.assetId);
    } else {
      return getAssetById(transaction.args.asset, chain?.assets) ?? null;
    }
  }

  return null;
};
