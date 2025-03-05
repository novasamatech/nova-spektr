import { type Chain, type Transaction } from '@/shared/core';
import { createPipeline } from '@/shared/di';
import { type AnyAccount } from '../account/types';

const wrapTransactionPipeline = createPipeline<Transaction, { account: AnyAccount; chain: Chain }>();

function wrapTransaction(transaction: Transaction, route: AnyAccount[], chain: Chain) {
  let wrapped = transaction;
  for (const account of Array.from(route).reverse()) {
    wrapped = wrapTransactionPipeline(wrapped, { account, chain });
  }
  return wrapped;
}

export const transactionService = {
  wrapTransactionPipeline,

  wrapTransaction,
};
