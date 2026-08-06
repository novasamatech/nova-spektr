import { type ApiPromise } from '@polkadot/api';
import { allSettled, createStore, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type AnyAccount, type AnyTransaction, transactionService } from '@/domains/network';

import { createWrappedTxStore } from './createWrappedTxStore';

const transaction: AnyTransaction = { type: 'encoded', callData: '0x0000' } as AnyTransaction;
const api = {} as ApiPromise;

describe('createWrappedTxStore', () => {
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
});
