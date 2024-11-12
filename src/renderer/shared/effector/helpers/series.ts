import { type Effect, type Event, type EventCallable, createEvent, createStore, sample } from 'effector';

import { nonNullable } from '@/shared/lib/utils';

export const series = <T>(target: EventCallable<T> | Effect<T, any>): EventCallable<T[]> => {
  const pop = createEvent();
  const push = createEvent<T[]>();

  const $queue = createStore<T[]>([])
    .on(push, (state, payload) => state.concat(payload))
    .on(pop, ([, ...rest]) => rest);
  const $head = $queue.map((queue) => queue.at(0) ?? null);
  const nextHeadRetrieved = $head.updates.filter({ fn: nonNullable }) as Event<T>;

  sample({
    clock: nextHeadRetrieved,
    target: [target, pop],
  });

  return push;
};
