import { type Event, type Store, type Unit, createEvent, is, sample } from 'effector';
import { combineEvents } from 'patronum';

import { nonNullable } from '@/shared/lib/utils/functions';

type Params<T, R, F extends R> = {
  source: Store<T> | Event<T>;
  clock: Store<R> | Event<R>;
  reset?: Unit<unknown> | Unit<unknown>[];
  filter?: (value: NoInfer<R>) => value is F;
};

export const waitFor = <const E, const R, const F extends R = R>({
  source,
  clock,
  reset,
  filter = (v: R): v is F => true,
}: Params<E, R, F>) => {
  const sourceEvent = is.store(source) ? source.updates : source;
  const clockEvent = is.store(clock) ? clock.updates : clock;
  const wait = createEvent<{ event: E; trigger: F }>();

  const resetEvent = createEvent();

  const combined = combineEvents({
    events: [sourceEvent, clockEvent],
    reset: resetEvent,
  }).filterMap(([event, trigger]) => {
    if (!filter || filter(trigger)) {
      return { event, trigger };
    }
  });

  // @ts-expect-error R to F conversion
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

  const resetEvents = Array.isArray(reset) ? reset : [reset];

  sample({
    clock: resetEvents.concat(wait).filter(nonNullable),
    target: resetEvent,
  });

  return wait;
};
