import { type ApiPromise } from '@polkadot/api';
import { allSettled, createStore, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import { polkadotChain } from '@/shared/mocks';
import { transactionService } from '@/domains/network';

import { createBatchCapacityCheck } from './createBatchCapacityCheck';

vi.mock('@/entities/transaction', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return {
    ...actual,
    getExtrinsic: new Proxy({}, { get: () => () => ({}) }),
  };
});

const api = {} as unknown as ApiPromise;
const transaction: Transaction = {
  chainId: polkadotChain.chainId,
  accountId: '0x00',
  type: TransactionType.BATCH_ALL,
  args: { transactions: [] },
} as unknown as Transaction;

const setup = () => {
  const $api = createStore<ApiPromise | null>(api);
  const $transaction = createStore<Transaction | null>(transaction);
  const $rows = createStore<number | null>(null);
  const check = createBatchCapacityCheck({ api: $api, transaction: $transaction, rows: $rows });

  return { $rows, ...check };
};

describe('createBatchCapacityCheck', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets the batch through when every row fits into one extrinsic', async () => {
    vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(1000);
    const { $rows, $maxRows, $blocksSubmit } = setup();

    const scope = fork();
    await allSettled($rows, { scope, params: 1000 });

    expect(scope.getState($maxRows)).toBeNull();
    expect(scope.getState($blocksSubmit)).toBe(false);
  });

  it('reports how many rows fit and blocks submit when the batch is too heavy', async () => {
    vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(312);
    const { $rows, $maxRows, $blocksSubmit } = setup();

    const scope = fork();
    await allSettled($rows, { scope, params: 1000 });

    expect(transactionService.getBatchCapacity).toHaveBeenCalledWith(expect.anything(), api, 1000);
    expect(scope.getState($maxRows)).toBe(312);
    expect(scope.getState($blocksSubmit)).toBe(true);
  });

  it('clears the verdict once the rows are gone', async () => {
    vi.spyOn(transactionService, 'getBatchCapacity').mockResolvedValue(312);
    const { $rows, $maxRows, $blocksSubmit } = setup();

    const scope = fork();
    await allSettled($rows, { scope, params: 1000 });
    await allSettled($rows, { scope, params: null });

    expect(scope.getState($maxRows)).toBeNull();
    expect(scope.getState($blocksSubmit)).toBe(false);
  });

  it('blocks submit while the weight is still being checked', async () => {
    let resolveCapacity: ((value: number) => void) | undefined;
    vi.spyOn(transactionService, 'getBatchCapacity').mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveCapacity = resolve;
        }),
    );
    const { $rows, $blocksSubmit } = setup();

    const scope = fork();
    const settled = allSettled($rows, { scope, params: 10 });

    await vi.waitFor(() => expect(resolveCapacity).toBeDefined());
    expect(scope.getState($blocksSubmit)).toBe(true);

    resolveCapacity?.(10);
    await settled;

    expect(scope.getState($blocksSubmit)).toBe(false);
  });
});
