import { type Store, combine, createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { nonNullableMap, nullableMap } from '@/shared/lib/utils';

type Stores<Args> = {
  [K in keyof Args]: Store<Args[K] | null>;
};

type Params<Args, Value> = {
  params: Stores<Args>;
  defaultValue: Value;
  fn: (args: Args) => Value | Promise<Value>;
};

export const createStoreFromEffect = <Args, Value>(params: Params<Args, Value>) => {
  const $source = combine(params.params, x => x);
  const $ = createStore<Value>(params.defaultValue);

  const fx = createEffect<{ args: Args; id: number }, Value>(({ args }) => params.fn(args));

  const incrementFxId = createEvent();
  const $lastFxId = createStore(0).on(incrementFxId, id => (id + 1) % Number.MAX_SAFE_INTEGER);

  sample({
    clock: $source,
    filter: nonNullableMap,
    target: incrementFxId,
  });

  sample({
    clock: incrementFxId,
    source: { source: $source, id: $lastFxId },
    fn: ({ source, id }) => ({ args: source as Args, id }),
    target: fx,
  });

  sample({
    clock: $source,
    filter: nullableMap,
    fn: () => params.defaultValue,
    target: $,
  });

  sample({
    clock: fx.done,
    source: { source: $source, lastFxId: $lastFxId },
    filter: ({ source, lastFxId }, data) => nonNullableMap(source) && data.params.id === lastFxId,
    fn: (_, data) => data.result,
    target: $,
  });

  sample({
    clock: fx.fail,
    fn: () => params.defaultValue,
    target: $,
  });

  return {
    $: readonly($),
    $pending: fx.pending,
    fx,
  };
};
