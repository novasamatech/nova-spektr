import { type TFunction } from 'i18next';
import { describe, expect, test } from 'vitest';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { getModalOperationTitle, getModalTransactionTitle } from './getMultisigSignOperationTitle';

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

  test('should title an edit delegation batch only when it holds delegation calls alone', () => {
    const undelegate = createTransaction(TransactionType.UNDELEGATE);
    const delegate = createTransaction(TransactionType.DELEGATE, { balance: '10000000000' });
    const nestedAddProxy = createBatch([createTransaction(TransactionType.ADD_PROXY, { proxyType: 'Any' })]);

    expect(getModalTransactionTitle(false, t, createBatch([undelegate, delegate]))).toEqual(
      'operations.modalTitles.editDelegationOn',
    );
    expect(getModalTransactionTitle(false, t, createBatch([undelegate, delegate, nestedAddProxy]))).toEqual(
      'operations.modalTitles.unknownOn',
    );
  });

  test('should name a batch after its proxy change', () => {
    const addProxy = createTransaction(TransactionType.ADD_PROXY, { proxyType: 'Any' });
    const removeProxy = createTransaction(TransactionType.REMOVE_PROXY, { proxyType: 'Any' });
    const remark = createTransaction(TransactionType.REMARK);

    expect(getModalTransactionTitle(false, t, createBatch([remark, addProxy]))).toEqual(
      'operations.modalTitles.addProxy',
    );
    expect(getModalTransactionTitle(false, t, createBatch([removeProxy, addProxy]))).toEqual(
      'operations.modalTitles.addProxy',
    );
    expect(getModalTransactionTitle(false, t, createBatch([removeProxy]))).toEqual(
      'operations.modalTitles.removeProxy',
    );
  });

  test('should fall back to unknown for batches the app does not build', () => {
    const batch = createBatch([createTransaction(TransactionType.ADD_PROXY), createTransaction(TransactionType.BOND)]);
    const proxied = createTransaction(TransactionType.PROXY, { transaction: batch });

    expect(getModalTransactionTitle(false, t, batch)).toEqual('operations.modalTitles.unknownOn');
    expect(getModalTransactionTitle(false, t, proxied)).toEqual('operations.modalTitles.unknownOn');
  });
});

describe('getModalOperationTitle', () => {
  const proxiedAccountId = '0x0404040404040404040404040404040404040404040404040404040404040404' as AccountId;
  const delegate = '0x0101010101010101010101010101010101010101010101010101010101010101';

  const createCall = (type: TransactionType, section: string, method: string, args: Record<string, unknown> = {}) =>
    ({ type, section, method, args }) as unknown as DecodedTransaction;
  const addProxy = createCall(TransactionType.ADD_PROXY, 'proxy', 'addProxy', { delegate, proxyType: 'Any' });
  const removeProxy = createCall(TransactionType.REMOVE_PROXY, 'proxy', 'removeProxy', { delegate, proxyType: 'Any' });
  const pair = createCall(TransactionType.BATCH_ALL, 'utility', 'batchAll', { transactions: [addProxy, removeProxy] });
  const proxied = createCall(TransactionType.PROXY, 'proxy', 'proxy', { real: delegate, transaction: pair });

  test('should title a live edit flexible operation like its card', () => {
    expect(getModalOperationTitle(false, t, { transaction: pair, proxiedAccountId })).toEqual(
      'operations.modalTitles.editFlexibleOn',
    );
    expect(getModalOperationTitle(false, t, { transaction: proxied })).toEqual('operations.modalTitles.editFlexibleOn');
  });

  test('should name a bare add + remove proxy pair on a plain multisig after its proxy change', () => {
    expect(getModalOperationTitle(false, t, { transaction: pair })).toEqual('operations.modalTitles.addProxy');
  });

  test('should fall back to unknown without an operation', () => {
    expect(getModalOperationTitle(false, t, null)).toEqual('operations.titles.unknown');
  });
});
