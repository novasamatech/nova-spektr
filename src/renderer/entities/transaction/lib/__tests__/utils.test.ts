import { type Transaction, TransactionType } from '@/shared/core';
import {
  findCoreBatchAll,
  getTransactionAmount,
  isAddProxyTransaction,
  isEditFlexibleTransaction,
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

  describe('isEditFlexibleTransaction', () => {
    test('should return true for valid edit flexible operation with removeProxy + addProxy', () => {
      const removeProxyTransaction: Transaction = {
        type: TransactionType.REMOVE_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const addProxyTransaction: Transaction = {
        type: TransactionType.ADD_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const editFlexibleTransaction: Transaction = {
        type: TransactionType.PROXY,
        args: {
          real: '0x00',
          transaction: {
            type: TransactionType.BATCH_ALL,
            args: {
              transactions: [addProxyTransaction, removeProxyTransaction],
            },
          },
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(editFlexibleTransaction)).toEqual(true);
    });

    test('should return false for batch with removeProxy + addProxy but non-Any proxyType', () => {
      const removeProxyTransaction: Transaction = {
        type: TransactionType.REMOVE_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const addProxyTransaction: Transaction = {
        type: TransactionType.ADD_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Staking', // Wrong proxy type
          delay: 0,
        },
      } as unknown as Transaction;

      const batchTransaction: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [removeProxyTransaction, addProxyTransaction],
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(batchTransaction)).toEqual(false);
    });

    test('should return false for batch with convictionVoting operations (removeVote + unlock)', () => {
      const removeVoteTransaction: Transaction = {
        type: TransactionType.REMOVE_VOTE,
        args: {
          track: 1,
          referendum: 123,
        },
      } as unknown as Transaction;

      const unlockTransaction: Transaction = {
        type: TransactionType.UNLOCK,
        args: {
          target: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          trackId: 1,
        },
      } as unknown as Transaction;

      const convictionVotingBatch: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [removeVoteTransaction, unlockTransaction],
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(convictionVotingBatch)).toEqual(false);
    });

    test('should return false for batch with wrong order (addProxy + removeProxy)', () => {
      const addProxyTransaction: Transaction = {
        type: TransactionType.ADD_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const removeProxyTransaction: Transaction = {
        type: TransactionType.REMOVE_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const wrongOrderBatch: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [removeProxyTransaction, addProxyTransaction], // Wrong order
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(wrongOrderBatch)).toEqual(false);
    });

    test('should return false for batch with non-proxy transactions', () => {
      const transferTransaction: Transaction = {
        type: TransactionType.TRANSFER,
        args: {
          dest: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          value: '1000000000000',
        },
      } as unknown as Transaction;

      const bondTransaction: Transaction = {
        type: TransactionType.BOND,
        args: {
          value: '1000000000000',
          payee: 'Staked',
        },
      } as unknown as Transaction;

      const nonProxyBatch: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [transferTransaction, bondTransaction],
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(nonProxyBatch)).toEqual(false);
    });

    test('should return false for batch with only one transaction', () => {
      const singleTransaction: Transaction = {
        type: TransactionType.REMOVE_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const singleTransactionBatch: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [singleTransaction],
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(singleTransactionBatch)).toEqual(false);
    });

    test('should return false for batch with more than two transactions', () => {
      const removeProxyTransaction: Transaction = {
        type: TransactionType.REMOVE_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const addProxyTransaction: Transaction = {
        type: TransactionType.ADD_PROXY,
        args: {
          delegate: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          proxyType: 'Any',
          delay: 0,
        },
      } as unknown as Transaction;

      const transferTransaction: Transaction = {
        type: TransactionType.TRANSFER,
        args: {
          dest: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          value: '1000000000000',
        },
      } as unknown as Transaction;

      const multiTransactionBatch: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [removeProxyTransaction, addProxyTransaction, transferTransaction],
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(multiTransactionBatch)).toEqual(false);
    });

    test('should return false for non-BATCH_ALL transaction', () => {
      const transferTransaction: Transaction = {
        type: TransactionType.TRANSFER,
        args: {
          dest: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          value: '1000000000000',
        },
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(transferTransaction)).toEqual(false);
    });

    test('should return false for null/undefined transaction', () => {
      expect(isEditFlexibleTransaction(null)).toEqual(false);
      expect(isEditFlexibleTransaction(undefined)).toEqual(false);
    });

    test('should return false for batch with missing args', () => {
      const batchWithoutArgs: Transaction = {
        type: TransactionType.BATCH_ALL,
        args: undefined,
      } as unknown as Transaction;

      expect(isEditFlexibleTransaction(batchWithoutArgs)).toEqual(false);
    });
  });

  describe('findCoreBatchAll', () => {
    const createTransaction = (type: TransactionType, args: Record<string, unknown> = {}) =>
      ({ type, args }) as unknown as Transaction;
    const createBatch = (transactions: Transaction[]) => createTransaction(TransactionType.BATCH_ALL, { transactions });
    const createBatchOf = (types: TransactionType[]) => createBatch(types.map((type) => createTransaction(type)));

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
      [[TransactionType.ADD_PROXY, TransactionType.REMARK], TransactionType.ADD_PROXY],
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
    ])('should return null for unknown batch shape: %j', (types) => {
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

    test('should not recurse endlessly on nested batches', () => {
      const nested = createBatch([createBatch([createBatch([unlock])])]);

      expect(getTransactionAmount(nested)).toBeNull();
    });

    test('should return the amount of the core transaction', () => {
      expect(getTransactionAmount(createBatch([createTransaction(TransactionType.REMOVE_VOTE), unlock]))).toBe('1');
    });

    test('should not return an amount for unknown batch shape', () => {
      const transfer = createTransaction(TransactionType.TRANSFER, { value: '5' });

      expect(getTransactionAmount(createBatch([transfer, createTransaction(TransactionType.ADD_PROXY)]))).toBeNull();
    });
  });
});
