import {
  type EventCallable,
  type Scope,
  type StoreWritable,
  allSettled,
  createEvent,
  createStore,
  createWatch,
  fork,
} from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type OperationReadiness, createOperationReadiness } from './createOperationReadiness';
import { type OperationBlockReason } from './operationBlockReason';

const SETTLE = 500;
const TIMEOUT = 15_000;

const timeoutReason = createStore<OperationBlockReason>({ kind: 'network-unreachable' });

// Arming the flow starts patronum's timer effects, and `allSettled` resolves only once every
// effect in the scope has finished — under fake timers those timers never fire on their own,
// so `await allSettled(...)` would deadlock. Effector propagates the update synchronously, so
// launching without awaiting and then flushing microtasks with a zero-length tick observes
// exactly the same state.
const activate = async (scope: Scope, $active: StoreWritable<boolean>, value = true) => {
  void allSettled($active, { scope, params: value });
  await vi.advanceTimersByTimeAsync(0);
};

const emit = async (scope: Scope, event: EventCallable<void>) => {
  void allSettled(event, { scope });
  await vi.advanceTimersByTimeAsync(0);
};

describe('createOperationReadiness', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is ready when every requirement is satisfied', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>('tx') }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    expect(scope.getState($readiness)).toEqual({ status: 'ready' });
  });

  it('reports the first unsatisfied step as pending', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        { key: 'wrapping', store: createStore<string | null>('tx') },
        { key: 'estimating-fee', store: createStore<string | null>(null) },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'estimating-fee' });
  });

  it('surfaces an explicit error immediately, without waiting for the settle delay', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'estimating-fee',
          store: createStore<string | null>(null),
          error: createStore<Error | null>(new Error('Too Many Requests')),
        },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    // `classifyRpcError` carries `detail` on every branch, so assert it too.
    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'node-rate-limited', detail: 'Too Many Requests' },
    });
  });

  it('classifies an explicit error against the step that produced it', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        { key: 'wrapping', store: createStore<string | null>('tx') },
        {
          key: 'estimating-fee',
          store: createStore<string | null>(null),
          error: createStore<Error | null>(new Error('boom')),
        },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    // 'boom' matches no marker, so the verdict can only come from the step key —
    // 'estimating-fee' yields 'fee-unavailable', any other step yields 'internal'.
    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'fee-unavailable', detail: 'boom' },
    });
  });

  it('withholds a deterministic block until the settle delay elapses', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'confirming',
          store: createStore<string | null>(null),
          blocked: createStore<OperationBlockReason | null>({ kind: 'no-signatory' }),
        },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'confirming' });

    await vi.advanceTimersByTimeAsync(SETTLE);

    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'no-signatory' },
    });
  });

  it('prefers a settled deterministic block over an explicit error', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'confirming',
          store: createStore<string | null>(null),
          blocked: createStore<OperationBlockReason | null>({ kind: 'no-signatory' }),
          error: createStore<Error | null>(new Error('Too Many Requests')),
        },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    // Before the settle delay tier 1 is muted, so the error wins.
    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'node-rate-limited', detail: 'Too Many Requests' },
    });

    await vi.advanceTimersByTimeAsync(SETTLE);

    // Once settled, the deterministic block takes precedence over the rejection.
    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'no-signatory' },
    });
  });

  it('stays pending while nothing has settled and the timeout has not fired', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null) }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT - 1);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'wrapping' });
  });

  it('falls back to the supplied timeout reason when nothing ever settles', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null) }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'network-unreachable' },
    });
  });

  it('never times out a flow that reached ready', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>('tx') }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness)).toEqual({ status: 'ready' });
  });

  it('clears the timeout and forwards retry to each requirement', async () => {
    const $active = createStore(false);
    const wrapRetry = createEvent();
    const feeRetry = createEvent();
    const $wrapRetried = createStore(0).on(wrapRetry, (count) => count + 1);
    const $feeRetried = createStore(0).on(feeRetry, (count) => count + 1);

    const { $readiness, retryRequested } = createOperationReadiness({
      active: $active,
      requirements: [
        { key: 'wrapping', store: createStore<string | null>(null), retry: wrapRetry },
        // No retry of its own — a requirement without one must not break the fanout.
        { key: 'confirming', store: createStore<string | null>(null) },
        { key: 'estimating-fee', store: createStore<string | null>(null), retry: feeRetry },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness).status).toBe('blocked');

    await emit(scope, retryRequested);

    expect(scope.getState($wrapRetried)).toBe(1);
    expect(scope.getState($feeRetried)).toBe(1);
    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'wrapping' });
  });

  it('restarts the timeout window on a retry issued before it fires', async () => {
    const $active = createStore(false);
    const { $readiness, retryRequested } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null) }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);

    // Retry a third of the way in, well before the original deadline.
    await vi.advanceTimersByTimeAsync(5_000);
    await emit(scope, retryRequested);

    // 10s after the retry the fresh window still has 5s left. If the arm did not cancel the
    // original timer, the retried attempt would inherit its deadline and block right here.
    await vi.advanceTimersByTimeAsync(10_000);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'wrapping' });

    await vi.advanceTimersByTimeAsync(5_000);

    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'network-unreachable' },
    });
  });

  it('re-arms the timeout after a retry so a still-stuck flow blocks again', async () => {
    const $active = createStore(false);
    const { $readiness, retryRequested } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null) }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    await emit(scope, retryRequested);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'wrapping' });

    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'network-unreachable' },
    });
  });

  it('does not arm any timer until the flow becomes active', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'confirming',
          store: createStore<string | null>(null),
          blocked: createStore<OperationBlockReason | null>({ kind: 'no-signatory' }),
        },
      ],
      timeoutReason,
    });

    const scope = fork();
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'confirming' });
  });

  it('resets settle and timeout state when the flow is deactivated', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'confirming',
          store: createStore<string | null>(null),
          blocked: createStore<OperationBlockReason | null>({ kind: 'no-signatory' }),
        },
      ],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness).status).toBe('blocked');

    await activate(scope, $active, false);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'confirming' });
  });

  it('does not carry a timer armed before deactivation into the next activation', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null) }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(1_000);
    await activate(scope, $active, false);

    // The first arm's timer would fire around here if closing the screen left it running.
    await vi.advanceTimersByTimeAsync(TIMEOUT);
    await activate(scope, $active);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'wrapping' });

    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness)).toEqual({
      status: 'blocked',
      reason: { kind: 'network-unreachable' },
    });
  });

  it('does not report a timeout that fires after the screen closed', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null) }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(1_000);
    await activate(scope, $active, false);

    // The timer armed on open is still pending and fires here, with nothing left on screen.
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness).status).not.toBe('blocked');
    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'wrapping' });
  });

  it('does not report a request that rejects after the screen closed', async () => {
    const $active = createStore(false);
    const $error = createStore<Error | null>(null);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'estimating-fee', store: createStore<string | null>(null), error: $error }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await activate(scope, $active, false);

    // Nothing aborts the in-flight fee request when the modal closes, so it can still reject.
    void allSettled($error, { scope, params: new Error('Too Many Requests') });
    await vi.advanceTimersByTimeAsync(0);

    expect(scope.getState($readiness).status).not.toBe('blocked');
    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'estimating-fee' });
  });

  it('emits no update at all once the screen closed', async () => {
    const $active = createStore(false);
    const $error = createStore<Error | null>(null);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [{ key: 'wrapping', store: createStore<string | null>(null), error: $error }],
      timeoutReason,
    });

    const scope = fork();
    await activate(scope, $active);
    await activate(scope, $active, false);

    // Watch only what happens *after* the close, so the close itself is not counted.
    const updates: OperationReadiness[] = [];
    createWatch({ unit: $readiness, scope, fn: (value) => updates.push(value) });

    void allSettled($error, { scope, params: new Error('Too Many Requests') });
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    // A fresh object literal per recomputation would still emit, even carrying a benign
    // payload — a consumer sampling `$readiness` for a toast or an analytics event would fire.
    expect(updates).toEqual([]);
  });

  it('treats a flow with no requirements as ready', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({ active: $active, requirements: [], timeoutReason });

    const scope = fork();
    await activate(scope, $active);
    await vi.advanceTimersByTimeAsync(TIMEOUT);

    expect(scope.getState($readiness)).toEqual({ status: 'ready' });
  });

  it('needs `active` to actually update — seeding it true via fork values arms nothing', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'confirming',
          store: createStore<string | null>(null),
          blocked: createStore<OperationBlockReason | null>({ kind: 'no-signatory' }),
        },
      ],
      timeoutReason,
    });

    // `active` is sampled as a clock, so only *updates* arm the clocks. A scope seeded with
    // `active: true` never emits one. Consumers must pass a store that flips when the screen
    // opens (a route match, a modal-open flag), never one that is already true at fork time —
    // and tests must drive it with `allSettled`, not `fork({ values })`.
    const scope = fork({ values: [[$active, true]] });
    await vi.advanceTimersByTimeAsync(TIMEOUT * 2);

    expect(scope.getState($readiness)).toEqual({ status: 'pending', step: 'confirming' });
  });

  it('keeps each forked scope independent', async () => {
    const $active = createStore(false);
    const { $readiness } = createOperationReadiness({
      active: $active,
      requirements: [
        {
          key: 'confirming',
          store: createStore<string | null>(null),
          blocked: createStore<OperationBlockReason | null>({ kind: 'no-signatory' }),
        },
      ],
      timeoutReason,
    });

    const armedScope = fork();
    const idleScope = fork();

    await activate(armedScope, $active);
    await vi.advanceTimersByTimeAsync(SETTLE);

    expect(armedScope.getState($readiness)).toEqual({ status: 'blocked', reason: { kind: 'no-signatory' } });
    expect(idleScope.getState($readiness)).toEqual({ status: 'pending', step: 'confirming' });
  });
});
