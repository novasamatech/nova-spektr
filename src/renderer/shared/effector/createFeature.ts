import { type Event, type Store, createDomain, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { nonNullable, nullable } from '@/shared/lib/utils';

type Params<T> = {
  name: string;
  input?: Store<T | null>;
  filter?: (input: T) => IdleState | Omit<FailedState<T>, 'data'> | null;
};

type ErrorType = 'fatal' | 'error' | 'warning';

type FailedStateParams = { error: Error; type: ErrorType };

type IdleState = { status: 'idle' };
type StartingState = { status: 'starting' };
type RunningState<T> = { status: 'running'; data: T };
type FailedState<T> = { status: 'failed'; data: T | null } & FailedStateParams;

type State<T> = IdleState | StartingState | RunningState<T> | FailedState<T>;

export type Feature<T> = ReturnType<typeof createFeature<T>>;

const calculateState = <T>(data: T | null, filter: Params<T>['filter']): State<T> => {
  if (nullable(data)) {
    return { status: 'starting' };
  }

  if (filter) {
    const filterResult = filter(data);
    if (filterResult === null) {
      return { status: 'running', data };
    }
    if (filterResult.status === 'idle') {
      return filterResult;
    }
    if (filterResult.status === 'failed') {
      return { status: 'failed', data, error: filterResult.error, type: filterResult.type };
    }
  }

  return { status: 'running', data };
};

export const createFeature = <T = null>({ name, filter, input = createStore(null) }: Params<T>) => {
  const domain = createDomain(name);

  const $input = domain.createStore<T | null>(null);
  const $state = domain.createStore<State<T>>({ status: 'idle' }, { name: 'state' });
  const $status = $state.map((x) => x.status);

  const start = domain.createEvent('start');
  const stop = domain.createEvent('stop');
  const fail = domain.createEvent<FailedStateParams>('fail');
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
    source: { data: input, status: $status },
    filter: ({ status }) => status !== 'starting' && status !== 'running',
    fn: ({ data }) => calculateState(data, filter),
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
    fn: (data) => calculateState(data, filter),
    target: $state,
  });

  sample({
    clock: fail,
    source: input,
    fn: (data, { error, type }): State<T> => ({ status: 'failed', data, error, type }),
    target: $state,
  });

  // Input data management

  sample({
    clock: inputFulfill,
    filter: isStarting,
    fn: (data) => calculateState(data, filter),
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
    fn: (data) => calculateState(data, filter),
    target: $state,
  });

  sample({
    clock: $state,
    fn: (state) => (state.status === 'running' ? state.data : state.status === 'failed' ? state.data : null),
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

    running: readonly(running),
    stopped: readonly(stopped),
    failed: readonly(failed),

    isRunning: readonly(isRunning),
    isStarting: readonly(isStarting),
    isFailed: readonly(isFailed),

    gate,

    start,
    stop,
    fail,
    restore,
  };
};
