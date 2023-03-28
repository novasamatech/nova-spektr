import { Transaction, TransactionType } from '@renderer/domain/transaction';

export const getTransactionType = (transaction?: Transaction): TransactionType | undefined => {
  if (transaction?.type === TransactionType.BATCH_ALL) {
    return (transaction.args.transactions[0] as Transaction).type;
  }

  return transaction?.type;
};
