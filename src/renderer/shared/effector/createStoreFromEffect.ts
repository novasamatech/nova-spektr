import { type Store, combine, createEffect, createStore, sample } from 'effector';
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

  const fx = createEffect(params.fn);

  sample({
    clock: $source,
    filter: nonNullableMap,
    fn: x => x as Args,
    target: fx,
  });

  sample({
    clock: $source,
    filter: nullableMap,
    fn: () => params.defaultValue,
    target: $,
  });

  sample({
    clock: fx.doneData,
    target: $,
  });

  sample({
    clock: fx.fail,
    fn: () => params.defaultValue,
    target: $,
  });

  return {
    $: readonly($),
    fx,
  };
};
