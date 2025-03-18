import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type AnyDecodedTransaction, type MultisigOperation, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';

type Props = {
  operation: MultisigOperation;
  variant: 'long' | 'short';
};

export const operationTitleSlot = createSlot<{
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
  variant: 'long' | 'short';
}>();
export const operationAdditionalInfoSlot = createSlot<{ transaction: AnyDecodedTransaction | null }>();

export const OperationTitle = memo(({ operation, variant }: Props) => {
  const apis = useUnit(networkModel.$apis);
  const api = apis[operation.chainId];
  const unwrappedPath = useMemo(() => {
    if (!api || !operation.transaction) return [];
    try {
      return transactionService.unwrapTransaction(operation.transaction, api);
    } catch {
      return [];
    }
  }, [api, operation]);
  const decodedTransaction = unwrappedPath.at(-1) ?? null;

  const methodTitle = decodedTransaction
    ? formatSectionAndMethod(decodedTransaction.section, decodedTransaction.method)
    : null;

  if (!decodedTransaction) {
    return null;
  }

  return (
    <div>
      <Slot id={operationTitleSlot} props={{ transaction: decodedTransaction, chainId: operation.chainId, variant }} />
      <span className="hidden [*:empty~&]:flex">{methodTitle}</span>
    </div>
  );
});
