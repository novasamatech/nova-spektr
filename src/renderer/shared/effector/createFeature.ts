import { type Event, type Store, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

type IdleState = { status: 'idle' };
type StartingState = { status: 'starting' };
type RunningState<T> = { status: 'running'; data: T };
type FailedState = { status: 'failed'; error: Error };

export type State<T> = IdleState | StartingState | RunningState<T> | FailedState;

export const createFeature = <T = null>(input: Store<T | null> = createStore<null>(null)) => {
  const $state = createStore<State<T>>({ status: 'idle' });
  const $status = $state.map((x) => x.status);
  const start = createEvent();
  const stop = createEvent();
  const stopped = createEvent();
  const running = createEvent<T>();
  const fail = createEvent<Error>();
  const restore = createEvent();

  const isRunning = $status.map((x) => x === 'running');
  const isStarting = $status.map((x) => x === 'starting');

  const inputFulfill = input.updates.filter({ fn: nonNullable }) as Event<T>;

  sample({
    clock: start,
    source: input,
    fn: (data): StartingState | RunningState<T> => (data ? { status: 'running', data } : { status: 'starting' }),
    target: $state,
  });

  sample({
    clock: stop,
    fn: (): IdleState => ({ status: 'idle' }),
    target: $state,
  });

  sample({
    clock: inputFulfill,
    filter: $status.map((status) => status === 'starting'),
    fn: (data): RunningState<T> => ({ status: 'running', data }),
    target: $state,
  });

  sample({
    clock: inputFulfill,
    filter: isRunning,
    target: running,
  });

  sample({
    clock: input.updates,
    filter: $status.map((status) => status === 'running'),
    fn: (data): StartingState | RunningState<T> => (data ? { status: 'running', data } : { status: 'starting' }),
    target: $state,
  });

  sample({
    clock: restore,
    source: input,
    filter: $status.map((status) => status === 'failed'),
    fn: (data): StartingState | RunningState<T> => (data ? { status: 'running', data } : { status: 'starting' }),
    target: $state,
  });

  sample({
    clock: fail,
    fn: (error): FailedState => ({ status: 'failed', error }),
    target: $state,
  });

  sample({
    clock: $status,
    filter: (status) => status === 'idle' || status === 'failed',
    target: stopped,
  });

  return {
    status: $status,
    state: readonly($state),
    updates: $state.updates,
    stopped,
    running,
    isRunning,
    isStarting,
    start,
    stop,
    fail,
    restore,
  };
};
