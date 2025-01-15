import { type Effect, type EventCallable, createEffect, is } from 'effector';

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
export const series = <T, R = any>(target: EventCallable<T> | Effect<T, R>) => {
  return createEffect(async (data: Iterable<T>) => {
    const result: R[] = [];
    for (const value of data) {
      if (is.effect(target)) {
        const r = await target(value);
        result.push(r);
      } else {
        target(value);
      }
    }

    return result;
  });
};
