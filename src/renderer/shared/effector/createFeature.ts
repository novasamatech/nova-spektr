import { type Event, type Store, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

type ErrorType = 'fatal' | 'error' | 'warning';

type IdleState = { status: 'idle' };
type StartingState = { status: 'starting' };
type RunningState<T> = { status: 'running'; data: T };
type FailedState = { status: 'failed'; error: Error; type: ErrorType };

type State<T> = IdleState | StartingState | RunningState<T> | FailedState;

export type Feature<T> = ReturnType<typeof createFeature<T>>;

export const createFeature = <T = null>(input: Store<T | null> = createStore(null)) => {
  const $state = createStore<State<T>>({ status: 'idle' });
  const $status = $state.map((x) => x.status);
  const $input = createStore<T | null>(null);

  const start = createEvent();
  const stop = createEvent();
  const fail = createEvent<{ error: Error; type: ErrorType }>();
  const restore = createEvent();

  const running = createEvent<T>();
  const failed = $status.updates.filter({ fn: (x) => x === 'failed' });
  const stopped = $status.updates.filter({ fn: (x) => x === 'idle' || x === 'failed' });

  const gate = createGate();

  const isRunning = $status.map((x) => x === 'running');
  const isStarting = $status.map((x) => x === 'starting');
  const isFailed = $status.map((x) => x === 'failed');

  const inputFulfill = input.updates.filter({ fn: nonNullable }) as Event<T>;

  sample({
    clock: gate.open,
    target: start,
  });

  sample({
    clock: gate.close,
    target: stop,
  });

  sample({
    clock: start,
    source: input,
    fn: (data): StartingState | RunningState<T> =>
      data !== null ? { status: 'running', data } : { status: 'starting' },
    target: $state,
  });

  sample({
    clock: stop,
    fn: (): IdleState => ({ status: 'idle' }),
    target: $state,
  });

  sample({
    clock: inputFulfill,
    filter: isStarting,
    fn: (data): RunningState<T> => ({ status: 'running', data }),
    target: $state,
  });

  sample({
    clock: $state,
    filter: ({ status }) => status === 'running',
    fn: (state) => (state as RunningState<T>).data,
    target: running,
  });

  sample({
    clock: input.updates,
    filter: isRunning,
    fn: (data): StartingState | RunningState<T> =>
      data !== null ? { status: 'running', data } : { status: 'starting' },
    target: $state,
  });

  sample({
    clock: $state,
    fn: (state) => (state.status === 'running' ? state.data : null),
    target: $input,
  });

  sample({
    clock: restore,
    source: input,
    filter: isFailed,
    fn: (data): StartingState | RunningState<T> =>
      data !== null ? { status: 'running', data } : { status: 'starting' },
    target: $state,
  });

  sample({
    clock: fail,
    fn: ({ error, type }): FailedState => ({ status: 'failed', error, type }),
    target: $state,
  });

  return {
    status: readonly($status),
    state: readonly($state),
    input: readonly($input),

    gate,

    running: readonly(running),
    stopped: readonly(stopped),
    failed: readonly(failed),

    isRunning: readonly(isRunning),
    isStarting: readonly(isStarting),
    isFailed: readonly(isFailed),

    start,
    stop,
    fail,
    restore,
  };
};
