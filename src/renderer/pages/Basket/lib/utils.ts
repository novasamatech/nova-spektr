import { type BasketTransaction, type Transaction, TransactionType } from '@shared/core';
import { isBatchAllWrapped } from '@/entities/transaction';

export const getCoreTx = (tx: BasketTransaction): Transaction => {
  return tx.coreTx.type === TransactionType.BATCH_ALL
    ? tx.coreTx.args.transactions.find((t: Transaction) => isBatchAllWrapped(t.type)) || tx.coreTx
    : tx.coreTx;
};
