import { type BasketTransaction, type Transaction, TransactionType } from '@/shared/core';
import { isEditDelegationTransaction, oldFindCoreBatchAll } from '@/entities/transaction';

export const getCoreTx = (tx: BasketTransaction): Transaction => {
  if (isEditDelegationTransaction(tx.coreTx)) {
    return tx.coreTx;
  }

  return tx.coreTx.type === TransactionType.BATCH_ALL ? oldFindCoreBatchAll(tx.coreTx) : tx.coreTx;
};
