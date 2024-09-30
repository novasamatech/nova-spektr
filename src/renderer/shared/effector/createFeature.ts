import { type Event, type Store, createDomain, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

type Params<T> = {
  name: string;
  input?: Store<T | null>;
};

type ErrorType = 'fatal' | 'error' | 'warning';

type IdleState = { status: 'idle' };
type StartingState = { status: 'starting' };
type RunningState<T> = { status: 'running'; data: T };
type FailedState = { status: 'failed'; error: Error; type: ErrorType };

type State<T> = IdleState | StartingState | RunningState<T> | FailedState;

export type Feature<T> = ReturnType<typeof createFeature<T>>;

export const createFeature = <T = null>({ name, input = createStore(null) }: Params<T>) => {
  const domain = createDomain(name);

  const $input = domain.createStore<T | null>(null);
  const $state = domain.createStore<State<T>>({ status: 'idle' }, { name: 'state' });
  const $status = $state.map((x) => x.status);

  const start = domain.createEvent('start');
  const stop = domain.createEvent('stop');
  const fail = domain.createEvent<{ error: Error; type: ErrorType }>('fail');
  const restore = domain.createEvent('restore');

  const running = domain.createEvent<T>('running');
  const failed = $status.updates.filter({ fn: (x) => x === 'failed' });
  const stopped = $status.updates.filter({ fn: (x) => x === 'idle' || x === 'failed' });

  const isRunning = $status.map((x) => x === 'running');
  const isStarting = $status.map((x) => x === 'starting');
  const isFailed = $status.map((x) => x === 'failed');

  const inputFulfill = input.updates.filter({ fn: nonNullable }) as Event<T>;

  // Status management

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

  // Input data management

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

  // Gate management

  const gate = createGate(name ? `${name}/gate` : undefined);
  const $gatesOpened = domain.createStore(0, { name: 'gatesOpened' });

  $gatesOpened.on(gate.open, (x) => x + 1);
  $gatesOpened.on(gate.close, (x) => x - 1);

  sample({
    clock: $gatesOpened,
    filter: (x) => x === 1,
    target: start,
  });

  sample({
    clock: $gatesOpened,
    filter: (x) => x === 0,
    target: stop,
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
