import { type TFunction } from 'i18next';

import { type Transaction, TransactionType } from '@/shared/core';

import { getModalTransactionTitle } from './getMultisigSignOperationTitle';

const t = ((key: string) => key) as unknown as TFunction;

const createTransaction = (type: TransactionType, args: Record<string, unknown> = {}) =>
  ({ type, args }) as unknown as Transaction;
const createBatch = (transactions: Transaction[]) => createTransaction(TransactionType.BATCH_ALL, { transactions });

describe('getModalTransactionTitle', () => {
  test('should use the core transaction of a batch', () => {
    const batch = createBatch([
      createTransaction(TransactionType.REMOVE_VOTE),
      createTransaction(TransactionType.UNLOCK),
    ]);

    expect(getModalTransactionTitle(false, t, batch)).toEqual('operations.modalTitles.unlockOn');
  });

  test('should fall back to unknown for nested batches', () => {
    const nested = createBatch([createBatch([createTransaction(TransactionType.UNLOCK)])]);
    const proxied = createTransaction(TransactionType.PROXY, { transaction: nested });

    expect(getModalTransactionTitle(false, t, nested)).toEqual('operations.modalTitles.unknownOn');
    expect(getModalTransactionTitle(false, t, proxied)).toEqual('operations.modalTitles.unknownOn');
  });

  test('should keep the title of a batch built by the app', () => {
    const batch = createBatch([createTransaction(TransactionType.BOND), createTransaction(TransactionType.NOMINATE)]);

    expect(getModalTransactionTitle(false, t, batch)).toEqual('operations.modalTitles.startStakingOn');
  });

  test('should fall back to unknown for batches the app does not build', () => {
    const batch = createBatch([createTransaction(TransactionType.ADD_PROXY), createTransaction(TransactionType.BOND)]);
    const proxied = createTransaction(TransactionType.PROXY, { transaction: batch });

    expect(getModalTransactionTitle(false, t, batch)).toEqual('operations.modalTitles.unknownOn');
    expect(getModalTransactionTitle(false, t, proxied)).toEqual('operations.modalTitles.unknownOn');
  });
});
