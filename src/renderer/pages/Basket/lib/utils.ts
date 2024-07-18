import { type BasketTransaction, type Transaction, TransactionType } from '@shared/core';

export const getCoreTx = (tx: BasketTransaction, types: TransactionType[]): Transaction => {
  return tx.coreTx.type === TransactionType.BATCH_ALL
    ? tx.coreTx.args.transactions.find((t: Transaction) => types.includes(t.type)) || tx.coreTx
    : tx.coreTx;
};
