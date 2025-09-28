import { type Store, combine, createStore, sample } from 'effector';
import { readonly, spread } from 'patronum';

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

/**
 * Creates a store that is automatically updated based on the result of an
 * effect function. Will return to default value if any of the parameter is
 * null.
 */
export const createStoreFromEffect = <Args, Value>(params: Params<Args, Value>) => {
  const $source = combine(params.params, x => x);
  const $ = createStore<Value>(params.defaultValue);
  const $isDefaultValue = createStore(true);

  const fx = takeLast<Args, Value>({
    key: () => 'createStoreFromEffect',
    fn: params.fn,
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
    fn: () => ({
      value: params.defaultValue,
      isDefaultValue: true,
    }),
    target: spread({
      value: $,
      isDefaultValue: $isDefaultValue,
    }),
  });

  sample({
    clock: fx.doneData,
    source: $source,
    // source should be still valid
    filter: nonNullableMap,
    fn: (_, value: Value) => ({
      value,
      isDefaultValue: false,
    }),
    target: spread({
      value: $,
      isDefaultValue: $isDefaultValue,
    }),
  });

  sample({
    clock: fx.failData,
    // filtering out abort error from takeLast
    filter: err => !err || !('name' in err) || err.name !== 'AbortError',
    fn: () => ({
      value: params.defaultValue,
      isDefaultValue: true,
    }),
    target: spread({
      value: $,
      isDefaultValue: $isDefaultValue,
    }),
  });

  return {
    $: readonly($),
    $pending: fx.pending,
    $isDefaultValue: readonly($isDefaultValue),
    fx,
  };
};
