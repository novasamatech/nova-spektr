import { type BasketTransaction, type Transaction, TransactionType } from '@shared/core';
import { findCoreBatchAll, isEditDelegationTransaction } from '@/entities/transaction';

export const getCoreTx = (tx: BasketTransaction): Transaction => {
  if (isEditDelegationTransaction(tx.coreTx)) {
    return tx.coreTx;
  }

  return tx.coreTx.type === TransactionType.BATCH_ALL ? findCoreBatchAll(tx.coreTx) : tx.coreTx;
};
