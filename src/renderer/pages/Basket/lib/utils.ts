import { type BasketTransaction, type Transaction, TransactionType } from '@shared/core';
import { isEditDelegationTransaction, isWrappedInBatchAll } from '@/entities/transaction';

export const getCoreTx = (tx: BasketTransaction): Transaction => {
  if (isEditDelegationTransaction(tx.coreTx)) {
    return tx.coreTx;
  }

  return tx.coreTx.type === TransactionType.BATCH_ALL
    ? tx.coreTx.args.transactions.find((t: Transaction) => isWrappedInBatchAll(t.type)) || tx.coreTx
    : tx.coreTx;
};
