import { type Effect, type Event, type EventCallable, createEvent, createStore, sample } from 'effector';

import { nonNullable } from '@/shared/lib/utils';

/**
 * Triggers target unit on each element of the input list.
 *
 * ```ts
 * const $store = createStore<number[]>([]);
 * const event = createEvent<number>();
 *
 * sample({
 *   clock: $store,
 *   target: series(event),
 * });
 *
 * $store.set([0, 1, 3]);
 * // event will be called 3 times, direct equivalent of
 * // event(0); event(1); event(2)
 * ```
 */
export const series = <T>(target: EventCallable<T> | Effect<T, any>) => {
  const pop = createEvent();
  const push = createEvent<Iterable<T> | ArrayLike<T>>();

  const $queue = createStore<T[]>([])
    .on(push, (state, payload) => state.concat(Array.from(payload)))
    .on(pop, ([, ...rest]) => rest);
  const $head = $queue.map((queue) => queue.at(0) ?? null);
  const nextHeadRetrieved = $head.updates.filter({ fn: nonNullable }) as Event<T>;

  sample({
    clock: nextHeadRetrieved,
    target: [target, pop],
  });

  return push;
};
