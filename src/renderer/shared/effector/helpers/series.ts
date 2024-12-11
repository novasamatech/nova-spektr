import { type Effect, type EventCallable, createEvent, createStore, sample } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';

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
    .on(push, (state, payload) => state.concat(Array.isArray(payload) ? payload : Array.from(payload)))
    .on(pop, ([, ...rest]) => rest);
  const $head = $queue.map((queue) => {
    const value = queue.at(0);
    if (nullable(value)) return null;

    return { value };
  });
  const nextHeadRetrieved = $head.updates.filter({ fn: nonNullable });

  sample({
    clock: nextHeadRetrieved,
    fn: ({ value }) => value,
    target: [target, pop],
  });

  return push;
};
