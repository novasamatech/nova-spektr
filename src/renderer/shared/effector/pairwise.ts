import { type Event, type Store, createEvent, createStore, sample } from 'effector';

/**
 * Emits pairs of consecutive store states as `{ prev, current }`. Skips the
 * first update (no previous value).
 *
 * @example
 *   const delta = pairwise($counter).map(
 *     ({ prev, current }) => current - prev,
 *   );
 */
export function pairwise<T>(source: Store<T>): Event<{ prev: T; current: T }> {
  const INITIAL = Symbol('pairwise_initial');
  const $prev = createStore<T | typeof INITIAL>(INITIAL, { serialize: 'ignore' });
  const result = createEvent<{ prev: T; current: T }>();

  sample({
    clock: source,
    source: $prev,
    filter: prev => prev !== INITIAL,
    fn: (prev, current) => ({ prev: prev as T, current }),
    target: result,
  });

  sample({ clock: source, target: $prev });

  return result;
}
