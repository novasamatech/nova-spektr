import { type Event, type Store, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { readonly } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

type IdleState = { status: 'idle' };
type StartingState = { status: 'starting' };
type RunningState<T> = { status: 'running'; data: T };
type FailedState = { status: 'failed'; error: Error };

type State<T> = IdleState | StartingState | RunningState<T> | FailedState;

export const createFeature = <T = null>(input: Store<T | null> = createStore(null)) => {
  const $state = createStore<State<T>>({ status: 'idle' });
  const $status = $state.map((x) => x.status);

  const start = createEvent();
  const stop = createEvent();
  const fail = createEvent<Error>();
  const restore = createEvent();

  const running = createEvent<T>();
  const stopped = $status.updates.filter({ fn: (x) => x === 'idle' });

  const gate = createGate();

  const isRunning = $status.map((x) => x === 'running');
  const isStarting = $status.map((x) => x === 'starting');

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
    clock: $state,
    filter: ({ status }) => status === 'running',
    fn: (state) => (state as RunningState<T>).data,
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

  return {
    status: $status,
    state: readonly($state),
    gate,

    // TODO make readonly
    running,
    stopped,

    isRunning,
    isStarting,

    start,
    stop,
    fail,
    restore,
  };
};
