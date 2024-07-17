import { type Transaction, TransactionType } from '@shared/core';

import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isTransferTransaction,
} from '../common/utils';

describe('entities/transaction/lib/onChainUtils', () => {
  test('should return true for a transfer transactions', () => {
    const transferTransaction = {
      type: TransactionType.TRANSFER,
    } as unknown as Transaction;
    const ormlTransferTransaction = {
      type: TransactionType.TRANSFER,
    } as unknown as Transaction;
    const assetTransferTransaction = {
      type: TransactionType.TRANSFER,
    } as unknown as Transaction;

    expect(isTransferTransaction(transferTransaction)).toEqual(true);
    expect(isTransferTransaction(ormlTransferTransaction)).toEqual(true);
    expect(isTransferTransaction(assetTransferTransaction)).toEqual(true);
  });

  test('should return false for an other transaction', () => {
    const transaction: Transaction = {
      type: TransactionType.BOND,
    } as unknown as Transaction;

    expect(isTransferTransaction(transaction)).toEqual(false);
  });

  test('should return true for add proxy transaction', () => {
    const transaction: Transaction = {
      type: TransactionType.ADD_PROXY,
    } as unknown as Transaction;

    expect(isAddProxyTransaction(transaction)).toEqual(true);
  });

  test('should return true for remove proxy transaction', () => {
    const transaction: Transaction = {
      type: TransactionType.REMOVE_PROXY,
    } as unknown as Transaction;

    expect(isRemoveProxyTransaction(transaction)).toEqual(true);
  });

  test('should return true for remove proxy transaction', () => {
    const addProxyTransaction: Transaction = {
      type: TransactionType.REMOVE_PROXY,
    } as unknown as Transaction;
    const removeProxyTransaction: Transaction = {
      type: TransactionType.REMOVE_PROXY,
    } as unknown as Transaction;

    expect(isManageProxyTransaction(addProxyTransaction)).toEqual(true);
    expect(isManageProxyTransaction(removeProxyTransaction)).toEqual(true);
  });
});
