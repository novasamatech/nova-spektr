import { type Event, type Store, type Unit, createEvent, is, sample } from 'effector';
import { combineEvents } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

type Params<T, R, F extends R> = {
  source: Store<T> | Event<T>;
  clock: Store<R> | Event<R>;
  reset?: Unit<unknown>;
  filter: (value: NoInfer<R>) => value is F;
};

export const waitFor = <const E, const R, const F extends R>({ source, clock, reset, filter }: Params<E, R, F>) => {
  const sourceEvent = is.store(source) ? source.updates : source;
  const clockEvent = is.store(clock) ? clock.updates : clock;
  const wait = createEvent<{ event: E; trigger: F }>();

  const resetEvent = createEvent();

  const combined = combineEvents({
    events: [sourceEvent, clockEvent],
    reset: resetEvent,
    // reset: sourceEvent,
  }).filterMap(([event, trigger]) => {
    if (filter(trigger)) {
      return { event, trigger };
    }
  });

  sample({
    clock: combined,
    target: wait,
  });

  if (is.store(clock)) {
    sample({
      clock: sourceEvent,
      source: clock,
      filter: filter,
      fn: (trigger, event) => ({ event, trigger }),
      target: wait,
    });
  }

  sample({
    clock: [reset, sourceEvent].filter(nonNullable),
    resetEvent,
  });

  return wait;
};
