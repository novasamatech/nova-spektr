import { useStoreMap } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type AnyTransaction, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';

export const useDecodedTransaction = (transaction: AnyTransaction | null, chainId: ChainId) => {
  const api = useStoreMap({
    store: networkModel.$apis,
    keys: [chainId],
    fn: (apis, [id]) => apis[id] ?? null,
  });

  return useMemo(() => {
    if (!transaction || !api) return null;

    try {
      return transactionService.decodeTransaction(transaction, api);
    } catch {
      return null;
    }
  }, [transaction, api]);
};
