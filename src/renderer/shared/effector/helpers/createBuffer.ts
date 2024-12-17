import { type Event, type Unit, createEvent, createStore, sample } from 'effector';
import { delay, readonly } from 'patronum';

type Params<T> = {
  source: Unit<T>;
  timeframe: number;
};

/**
 * Collect values from source unit to buffer and flush them after given timeout.
 * This implementation doesn't have any debounce/throttle logic.
 *
 * @example
 *   ```ts
 *   // Pushing new values to list
 *   const flush = createBuffer({ source: createItem, timeframe: 1000 });
 *
 *   sample({
 *     clock: flush,
 *     source: $list,
 *     fn: (existing, buffer) => existing.concat(buffer),
 *     target: $list,
 *   });
 *   ```;
 */
export const createBuffer = <T>({ source, timeframe }: Params<T>) => {
  const $buffer = createStore<T[]>([]);
  const call = createEvent<T[]>();
  const flush = delay({ source, timeout: timeframe }) as Event<T>;

  sample({
    clock: source,
    source: $buffer,
    fn: (buffer, value) => buffer.concat(value),
    target: $buffer,
  });

  sample({
    clock: flush,
    source: $buffer,
    filter: (buffer) => buffer.length > 0,
    target: call,
  });

  sample({
    clock: flush,
    fn: () => [],
    target: $buffer,
  });

  return readonly(call);
};
