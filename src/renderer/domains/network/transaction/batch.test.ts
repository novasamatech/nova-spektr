import { type Transaction, TransactionType } from '@/shared/core';

import { findCoreBatchAll, isEditDelegationTransaction, isKnownBatchShape, isWrappedInBatchAll } from './batch';

const createTransaction = (type: TransactionType, args: Record<string, unknown> = {}) =>
  ({ type, args }) as unknown as Transaction;
const createBatch = (transactions: Transaction[]) => createTransaction(TransactionType.BATCH_ALL, { transactions });

describe('findCoreBatchAll', () => {
  const createBatchOf = (types: TransactionType[]) => createBatch(types.map(type => createTransaction(type)));

  const unlock = createTransaction(TransactionType.UNLOCK, { value: '1' });

  test('should prefer unlock among direct children', () => {
    const removeVote = createTransaction(TransactionType.REMOVE_VOTE);

    expect(findCoreBatchAll(createBatch([removeVote, unlock]))).toBe(unlock);
  });

  test('should pick a supported transaction over the first one', () => {
    const chill = createTransaction(TransactionType.CHILL);
    const unstake = createTransaction(TransactionType.UNSTAKE);

    expect(findCoreBatchAll(createBatch([chill, unstake]))).toBe(unstake);
  });

  test.each([
    [[TransactionType.BOND, TransactionType.NOMINATE], TransactionType.BOND],
    [[TransactionType.CHILL, TransactionType.UNSTAKE], TransactionType.UNSTAKE],
    [
      [TransactionType.PAYOUT_STAKERS_BY_PAGE, TransactionType.PAYOUT_STAKERS_BY_PAGE],
      TransactionType.PAYOUT_STAKERS_BY_PAGE,
    ],
    [[TransactionType.REMOVE_VOTE, TransactionType.UNDELEGATE, TransactionType.UNLOCK], TransactionType.UNLOCK],
    [[TransactionType.REMOVE_VOTE, TransactionType.REMOVE_VOTE], TransactionType.REMOVE_VOTE],
    [[TransactionType.DELEGATE, TransactionType.DELEGATE], TransactionType.DELEGATE],
    [[TransactionType.UNDELEGATE, TransactionType.UNDELEGATE], TransactionType.UNDELEGATE],
    [[TransactionType.UNDELEGATE, TransactionType.DELEGATE], TransactionType.UNDELEGATE],
    [[TransactionType.VESTED_TRANSFER, TransactionType.VESTED_TRANSFER], TransactionType.VESTED_TRANSFER],
    [[TransactionType.TRANSFER, TransactionType.TRANSFER], TransactionType.TRANSFER],
    [[TransactionType.ADD_PROXY, TransactionType.REMOVE_PROXY], TransactionType.ADD_PROXY],
    [[TransactionType.REMOVE_PROXY, TransactionType.ADD_PROXY], TransactionType.ADD_PROXY],
    [[TransactionType.REMOVE_PROXY, TransactionType.REMOVE_PROXY], TransactionType.REMOVE_PROXY],
    [[TransactionType.ADD_PROXY, TransactionType.REMARK], TransactionType.ADD_PROXY],
    [[TransactionType.REMARK, TransactionType.ADD_PROXY], TransactionType.ADD_PROXY],
  ])('should resolve batch built by the app: %j', (types, expected) => {
    expect(findCoreBatchAll(createBatchOf(types))?.type).toBe(expected);
  });

  test.each([
    [[TransactionType.ADD_PROXY, TransactionType.BOND]],
    [[TransactionType.BOND, TransactionType.NOMINATE, TransactionType.ADD_PROXY]],
    [[TransactionType.TRANSFER, TransactionType.ADD_PROXY]],
    [[TransactionType.VESTED_TRANSFER, TransactionType.ADD_PROXY]],
    [[TransactionType.REMOVE_VOTE, TransactionType.UNLOCK, TransactionType.TRANSFER]],
    [[TransactionType.TRANSFER, TransactionType.ASSET_TRANSFER]],
  ])('should return null for unknown batch shape: %j', types => {
    expect(findCoreBatchAll(createBatchOf(types))).toBeNull();
  });

  test('should return null for an empty batch', () => {
    expect(findCoreBatchAll(createBatch([]))).toBeNull();
  });

  test('should return null for a call without a known type', () => {
    expect(
      findCoreBatchAll(createBatch([createTransaction(TransactionType.BOND), { args: {} } as Transaction])),
    ).toBeNull();
  });

  test('should never return a batch', () => {
    const nested = createBatch([createBatch([unlock])]);

    expect(findCoreBatchAll(nested)).toBeNull();
  });
});

describe('isEditDelegationTransaction', () => {
  const delegate = createTransaction(TransactionType.DELEGATE, { balance: '1' });
  const undelegate = createTransaction(TransactionType.UNDELEGATE);

  test('should detect a batch of delegate and undelegate calls only', () => {
    expect(isEditDelegationTransaction(createBatch([undelegate, delegate]))).toBe(true);
    expect(isEditDelegationTransaction(createBatch([undelegate, undelegate, delegate, delegate]))).toBe(true);
  });

  test('should require both delegate and undelegate calls', () => {
    expect(isEditDelegationTransaction(createBatch([delegate]))).toBe(false);
    expect(isEditDelegationTransaction(createBatch([undelegate, undelegate]))).toBe(false);
    expect(isEditDelegationTransaction(createBatch([]))).toBe(false);
    expect(isEditDelegationTransaction(delegate)).toBe(false);
    expect(isEditDelegationTransaction(null)).toBe(false);
  });

  test('should reject a batch with an extra call', () => {
    const addProxy = createTransaction(TransactionType.ADD_PROXY);

    expect(isEditDelegationTransaction(createBatch([undelegate, delegate, addProxy]))).toBe(false);
  });

  test('should reject a batch with a nested batch', () => {
    const nested = createBatch([createTransaction(TransactionType.ADD_PROXY)]);

    expect(isEditDelegationTransaction(createBatch([undelegate, delegate, nested]))).toBe(false);
    expect(isEditDelegationTransaction(createBatch([createBatch([undelegate, delegate])]))).toBe(false);
  });
});

describe('isKnownBatchShape', () => {
  test('should accept any non-empty mix of one shape', () => {
    expect(isKnownBatchShape([createTransaction(TransactionType.NOMINATE)])).toBe(true);
    expect(isKnownBatchShape([createTransaction(TransactionType.REMOVE_VOTE)])).toBe(true);
  });

  test('should reject an empty list and calls of different shapes', () => {
    expect(isKnownBatchShape([])).toBe(false);
    expect(
      isKnownBatchShape([createTransaction(TransactionType.BOND), createTransaction(TransactionType.UNLOCK)]),
    ).toBe(false);
  });
});

describe('isWrappedInBatchAll', () => {
  test('should recognise calls the app wraps in a batch', () => {
    expect(isWrappedInBatchAll(TransactionType.BOND)).toBe(true);
    expect(isWrappedInBatchAll(TransactionType.TRANSFER)).toBe(false);
  });
});
