import { useMemo } from 'react';

import { type Asset } from '@/shared/core';
import { type Draft } from '@/domains/backend';
import { findCoreTransaction, getTransactionAmount, useTransactionAsset } from '@/entities/transaction';

import { useDecodedDraftTransaction } from './useDecodedDraftTransaction';

type DraftTransactionAmount = {
  value: string;
  asset: Asset;
};

export const useDraftTransactionAmount = (draft: Draft): DraftTransactionAmount | null => {
  const decodedTransaction = useDecodedDraftTransaction(draft);
  const coreTx = findCoreTransaction(decodedTransaction);
  const asset = useTransactionAsset(coreTx, draft.chainId);

  return useMemo(() => {
    if (!coreTx || !asset) return null;
    const value = getTransactionAmount(coreTx);
    if (!value) return null;

    return { value, asset };
  }, [coreTx, asset]);
};
