import { type ApiPromise } from '@polkadot/api';
import { allSettled, createStore, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type AnyAccount, type AnyTransaction, transactionService } from '@/domains/network';

import { createWrappedTxStore } from './createWrappedTxStore';

const transaction: AnyTransaction = { type: 'encoded', callData: '0x0000' } as AnyTransaction;
const api = {} as ApiPromise;

describe('createWrappedTxStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the failure and clears the tx when wrapping rejects', async () => {
    const failure = new Error('WebSocket is not connected');
    vi.spyOn(transactionService, 'wrapTransaction').mockRejectedValueOnce(failure);

    const $transaction = createStore<AnyTransaction | null>(null);
    const { $tx, $error } = createWrappedTxStore({
      api: createStore<ApiPromise | null>(api),
      transaction: $transaction,
      route: createStore<AnyAccount[]>([]),
    });

    const scope = fork();
    await allSettled($transaction, { scope, params: transaction });

    expect(scope.getState($error)).toBe(failure);
    expect(scope.getState($tx)).toBeNull();
  });

  it('clears the error and re-runs wrapping on retry', async () => {
    const wrapped: AnyTransaction = { type: 'encoded', callData: '0x1111' } as AnyTransaction;
    vi.spyOn(transactionService, 'wrapTransaction')
      .mockRejectedValueOnce(new Error('WebSocket is not connected'))
      .mockResolvedValueOnce(wrapped);

    const $transaction = createStore<AnyTransaction | null>(null);
    const { $tx, $error, retry } = createWrappedTxStore({
      api: createStore<ApiPromise | null>(api),
      transaction: $transaction,
      route: createStore<AnyAccount[]>([]),
    });

    const scope = fork();
    await allSettled($transaction, { scope, params: transaction });
    await allSettled(retry, { scope });

    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($tx)).toEqual(wrapped);
  });

  it('clears a previously wrapped tx when a later retry fails', async () => {
    const wrapped: AnyTransaction = { type: 'encoded', callData: '0x2222' } as AnyTransaction;
    const failure = new Error('WebSocket is not connected');
    vi.spyOn(transactionService, 'wrapTransaction').mockResolvedValueOnce(wrapped).mockRejectedValueOnce(failure);

    const $transaction = createStore<AnyTransaction | null>(null);
    const { $tx, $error, retry } = createWrappedTxStore({
      api: createStore<ApiPromise | null>(api),
      transaction: $transaction,
      route: createStore<AnyAccount[]>([]),
    });

    const scope = fork();
    await allSettled($transaction, { scope, params: transaction });
    expect(scope.getState($tx)).toEqual(wrapped);

    await allSettled(retry, { scope });

    expect(scope.getState($error)).toBe(failure);
    expect(scope.getState($tx)).toBeNull();
  });

  it('ignores a superseded wrap that resolves late, so it cannot overwrite a newer result', async () => {
    const staleTx: AnyTransaction = { type: 'encoded', callData: '0xstale' } as AnyTransaction;
    const failure = new Error('second wrap failed');

    let resolveStale: (value: AnyTransaction) => void;
    const staleWrap = new Promise<AnyTransaction>((resolve) => {
      resolveStale = resolve;
    });

    const wrapTransactionSpy = vi
      .spyOn(transactionService, 'wrapTransaction')
      .mockImplementationOnce(() => staleWrap)
      .mockImplementationOnce(() => Promise.reject(failure));

    const $transaction = createStore<AnyTransaction | null>(null);
    const { $tx, $error, retry } = createWrappedTxStore({
      api: createStore<ApiPromise | null>(api),
      transaction: $transaction,
      route: createStore<AnyAccount[]>([]),
    });

    const scope = fork();

    // Start the first wrap; it stays in-flight until `resolveStale` is called below,
    // so we must not await it here.
    void allSettled($transaction, { scope, params: transaction });
    await vi.waitFor(() => expect(wrapTransactionSpy).toHaveBeenCalledTimes(1));

    // Supersede it with a retry whose wrap rejects promptly.
    void allSettled(retry, { scope });
    await vi.waitFor(() => expect(scope.getState($error)).toBe(failure));
    expect(scope.getState($tx)).toBeNull();

    // Let the superseded first run resolve late with a stale tx. It must not
    // resurrect a signable tx or silently erase the live error.
    resolveStale!(staleTx);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(scope.getState($tx)).toBeNull();
    expect(scope.getState($error)).toBe(failure);
  });

  it('clears a stale error once a re-wrap succeeds without an explicit retry', async () => {
    const wrapped: AnyTransaction = { type: 'encoded', callData: '0x3333' } as AnyTransaction;
    const failure = new Error('WebSocket is not connected');
    vi.spyOn(transactionService, 'wrapTransaction').mockRejectedValueOnce(failure).mockResolvedValueOnce(wrapped);

    const $transaction = createStore<AnyTransaction | null>(null);
    const { $tx, $error } = createWrappedTxStore({
      api: createStore<ApiPromise | null>(api),
      transaction: $transaction,
      route: createStore<AnyAccount[]>([]),
    });

    const scope = fork();
    await allSettled($transaction, { scope, params: transaction });
    expect(scope.getState($error)).toBe(failure);

    const nextTransaction: AnyTransaction = { type: 'encoded', callData: '0x4444' } as AnyTransaction;
    await allSettled($transaction, { scope, params: nextTransaction });

    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($tx)).toEqual(wrapped);
  });
});
