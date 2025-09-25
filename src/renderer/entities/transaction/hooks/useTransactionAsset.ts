import { useStoreMap } from 'effector-react';

import { type Asset } from '@/shared/core';
import { getAssetByOnChainId } from '@/shared/lib/utils';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';

export const useTransactionAsset = (operation: MultisigOperation): Asset | null => {
  const chain = useStoreMap({
    store: networkModel.$chains,
    keys: [operation.chainId],
    fn: (chains, [id]) => chains[id] ?? null,
  });

  if (operation.transaction && chain) {
    return getAssetByOnChainId(operation.transaction.args.asset, chain.assets);
  }

  return null;
};
