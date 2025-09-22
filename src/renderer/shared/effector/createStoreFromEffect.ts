import { type Store, combine, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { nonNullableMap, nullableMap } from '@/shared/lib/utils';

import { takeLast } from './takeLast';

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

  const fx = takeLast({
    key: () => 'createStoreFromEffect',
    fn: async (args: Args): Promise<Awaited<Value>> => await params.fn(args),
  });

  sample({
    clock: $source,
    filter: nonNullableMap,
    fn: source => source as Args,
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
    source: $source,
    // source should be still valid
    filter: nonNullableMap,
    fn: (_, res: Value) => res,
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
