import { type SubmittableExtrinsic } from '@polkadot/api/types/submittable';
import { BN } from '@polkadot/util';
import { allSettled, createStore, fork, scopeBind } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { transactionService } from '@/domains/network';

import { createFeeCalculator } from './createFeeCalculator';

const extrinsic = {} as SubmittableExtrinsic<'promise'>;

describe('createFeeCalculator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the failure when fee estimation rejects', async () => {
    const failure = new Error('-32603: Too Many Requests, Please apply on OnFinality API key');
    vi.spyOn(transactionService, 'getExtrinsicFee').mockRejectedValueOnce(failure);

    const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
    const { $, $error } = createFeeCalculator({ extrinsic: $extrinsic });

    const scope = fork();
    await allSettled($extrinsic, { scope, params: extrinsic });

    expect(scope.getState($error)).toBe(failure);
    expect(scope.getState($)).toBeNull();
  });

  it('clears the error and recalculates on retry', async () => {
    vi.spyOn(transactionService, 'getExtrinsicFee')
      .mockRejectedValueOnce(new Error('WebSocket is not connected'))
      .mockResolvedValueOnce(new BN(42));

    const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
    const { $, $error, retry } = createFeeCalculator({ extrinsic: $extrinsic });

    const scope = fork();
    await allSettled($extrinsic, { scope, params: extrinsic });
    await allSettled(retry, { scope });

    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($)?.toString()).toBe('42');
  });

  it('does not surface an error when a stale calculation is superseded by a newer one', async () => {
    let resolveFirst: ((value: BN) => void) | undefined;
    const firstCall = new Promise<BN>((resolve) => {
      resolveFirst = resolve;
    });

    vi.spyOn(transactionService, 'getExtrinsicFee')
      .mockImplementationOnce(() => firstCall)
      .mockResolvedValueOnce(new BN(7));

    const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
    const { $, $error, $pending, retry } = createFeeCalculator({ extrinsic: $extrinsic });

    const scope = fork();
    // `allSettled` awaits the whole scope, not just its own trigger, so a second
    // `allSettled` call would deadlock while the first calculation is still
    // in flight. `scopeBind` dispatches into the scope without waiting for settle.
    const boundRetry = scopeBind(retry, { scope });

    const firstRun = allSettled($extrinsic, { scope, params: extrinsic });

    // Wait until the first calculation is actually in flight before superseding it.
    for (let i = 0; i < 100 && !scope.getState($pending); i += 1) {
      await Promise.resolve();
    }
    expect(scope.getState($pending)).toBe(true);

    boundRetry();

    // Now let the stale first call resolve; takeLast should turn its outcome into
    // an AbortError rather than a real failure.
    resolveFirst?.(new BN(1));
    await firstRun;

    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($)?.toString()).toBe('7');
  });

  it('clears the error as soon as retry fires, before the recalculation settles', async () => {
    let resolveRetry: ((value: BN) => void) | undefined;
    const retryCall = new Promise<BN>((resolve) => {
      resolveRetry = resolve;
    });

    vi.spyOn(transactionService, 'getExtrinsicFee')
      .mockRejectedValueOnce(new Error('WebSocket is not connected'))
      .mockImplementationOnce(() => retryCall);

    const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
    const { $error, $pending, retry } = createFeeCalculator({ extrinsic: $extrinsic });

    const scope = fork();
    await allSettled($extrinsic, { scope, params: extrinsic });
    expect(scope.getState($error)).not.toBeNull();

    // Fire retry without awaiting the whole scope, so we can inspect $error while
    // the recalculation it triggered is still in flight.
    const boundRetry = scopeBind(retry, { scope });
    boundRetry();

    for (let i = 0; i < 100 && !scope.getState($pending); i += 1) {
      await Promise.resolve();
    }

    expect(scope.getState($pending)).toBe(true);
    expect(scope.getState($error)).toBeNull();

    resolveRetry?.(new BN(5));
    for (let i = 0; i < 100 && scope.getState($pending); i += 1) {
      await Promise.resolve();
    }
  });

  it('clears an existing error when a fresh, non-retry recalculation succeeds', async () => {
    const secondExtrinsic = {} as SubmittableExtrinsic<'promise'>;

    vi.spyOn(transactionService, 'getExtrinsicFee')
      .mockRejectedValueOnce(new Error('WebSocket is not connected'))
      .mockResolvedValueOnce(new BN(99));

    const $extrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null);
    const { $, $error } = createFeeCalculator({ extrinsic: $extrinsic });

    const scope = fork();
    await allSettled($extrinsic, { scope, params: extrinsic });
    expect(scope.getState($error)).not.toBeNull();

    await allSettled($extrinsic, { scope, params: secondExtrinsic });

    expect(scope.getState($error)).toBeNull();
    expect(scope.getState($)?.toString()).toBe('99');
  });
});
