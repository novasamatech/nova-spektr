import { type Transaction, TransactionType } from '@/shared/core';
import {
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

  describe('getTransactionAmount of batches', () => {
    const createTransaction = (type: TransactionType, args: Record<string, unknown> = {}) =>
      ({ type, args }) as unknown as Transaction;
    const createBatch = (transactions: Transaction[]) => createTransaction(TransactionType.BATCH_ALL, { transactions });

    const unlock = createTransaction(TransactionType.UNLOCK, { value: '1' });
    const delegate = createTransaction(TransactionType.DELEGATE, { balance: '1' });
    const undelegate = createTransaction(TransactionType.UNDELEGATE);

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

    test('should not return a delegation amount for a batch with extra calls', () => {
      const nested = createBatch([createTransaction(TransactionType.ADD_PROXY)]);

      expect(getTransactionAmount(createBatch([undelegate, delegate]))).toBe('1');
      expect(getTransactionAmount(createBatch([undelegate, delegate, nested]))).toBeNull();
    });
  });

  describe('getTransactionAmount of votes', () => {
    const createVote = (vote: unknown) =>
      ({ type: TransactionType.VOTE, args: { track: 0, referendum: 1, vote } }) as unknown as Transaction;

    test('should return the balance of a standard vote', () => {
      const vote = { Standard: { balance: '1,500', vote: { aye: true, conviction: 'None' } } };

      expect(getTransactionAmount(createVote(vote))).toBe('1500');
    });

    test('should return aye plus nay of a split vote', () => {
      expect(getTransactionAmount(createVote({ Split: { aye: '1,000', nay: '2,000' } }))).toBe('3000');
    });

    test('should return aye plus nay plus abstain of a split abstain vote', () => {
      const vote = { SplitAbstain: { aye: '1,000', nay: '2,000', abstain: '4,000' } };

      expect(getTransactionAmount(createVote(vote))).toBe('7000');
    });

    test('should return null for an unknown vote shape', () => {
      expect(getTransactionAmount(createVote({ Other: {} }))).toBeNull();
      expect(getTransactionAmount(createVote(undefined))).toBeNull();
    });

    test('should return null for a malformed amount', () => {
      expect(getTransactionAmount(createVote({ Split: { aye: 'abc', nay: '1' } }))).toBeNull();
    });
  });
});
