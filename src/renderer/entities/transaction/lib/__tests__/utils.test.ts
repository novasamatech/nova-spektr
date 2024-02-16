import { Transaction, TransactionType } from '../../model/transaction';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isTransferTransaction,
} from '../common/utils';

describe('entities/transaction/lib/common/utils', () => {
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

    expect(isTransferTransaction(transferTransaction)).toBe(true);
    expect(isTransferTransaction(ormlTransferTransaction)).toBe(true);
    expect(isTransferTransaction(assetTransferTransaction)).toBe(true);
  });

  test('should return false for an other transaction', () => {
    const transaction: Transaction = {
      type: TransactionType.BOND,
    } as unknown as Transaction;

    expect(isTransferTransaction(transaction)).toBe(false);
  });

  test('should return true for add proxy transaction', () => {
    const transaction: Transaction = {
      type: TransactionType.ADD_PROXY,
    } as unknown as Transaction;

    expect(isAddProxyTransaction(transaction)).toBe(true);
  });

  test('should return true for remove proxy transaction', () => {
    const transaction: Transaction = {
      type: TransactionType.REMOVE_PROXY,
    } as unknown as Transaction;

    expect(isRemoveProxyTransaction(transaction)).toBe(true);
  });

  test('should return true for remove proxy transaction', () => {
    const addProxyTransaction: Transaction = {
      type: TransactionType.REMOVE_PROXY,
    } as unknown as Transaction;
    const removeProxyTransaction: Transaction = {
      type: TransactionType.REMOVE_PROXY,
    } as unknown as Transaction;

    expect(isManageProxyTransaction(addProxyTransaction)).toBe(true);
    expect(isManageProxyTransaction(removeProxyTransaction)).toBe(true);
  });
});
