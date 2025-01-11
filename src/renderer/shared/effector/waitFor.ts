import { type Unit, createEvent, createStore, sample } from 'effector';

type Params<T, R, F extends R> = {
  source: Unit<T>;
  clock: Unit<R>;
  reset?: Unit<unknown>;
  predicate: (value: NoInfer<R>) => value is F;
};

export const waitFor = <const E, const R, const F extends R>({ source, clock, reset, predicate }: Params<E, R, F>) => {
  const empty = Symbol();
  const $eventParams = createStore<E | symbol>(empty);
  const resultEvent = createEvent<{ event: E; trigger: F }>();

  // direct trigger
  sample({
    clock: source,
    source: clock,
    filter: predicate,
    fn: (trigger, event) => ({ event, trigger }),
    target: resultEvent,
  });

  // reset params on successful call
  sample({
    clock: resultEvent,
    fn: () => empty,
    target: $eventParams,
  });

  // reset params with external event
  if (reset) {
    sample({
      clock: reset,
      fn: () => empty,
      target: $eventParams,
    });
  }

  // saving params for later call
  sample({
    clock: source,
    source: clock,
    filter: source => !predicate(source),
    fn: (_, data) => data,
    target: $eventParams,
  });

  //
  sample({
    clock: clock,
    source: $eventParams,
    filter: (event, source) => event !== empty && predicate(source),
    fn: (event, trigger) => ({ event: event as E, trigger: trigger as F }),
    target: resultEvent,
  });

  return resultEvent;
};
