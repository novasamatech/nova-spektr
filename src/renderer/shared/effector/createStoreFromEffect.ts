import { type Store, combine, createEvent, createStore, sample } from 'effector';
import { readonly, spread } from 'patronum';

import { nonNullableMap, nullableMap } from '@/shared/lib/utils';

import { isAbortError } from './isAbortError';
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
 *
 * A thrown `fn` also returns the store to its default and surfaces the error on
 * `$error`; `retry` re-runs `fn` with the current params, which is the only way
 * to recover when the params themselves never change.
 */
export const createStoreFromEffect = <Args, Value>(params: Params<Args, Value>) => {
  const $source = combine(params.params, x => x);
  const $ = createStore<Value>(params.defaultValue);
  const $isDefaultValue = createStore(true);
  const $error = createStore<Error | null>(null);
  const retry = createEvent();

  const fx = takeLast<Args, Value>({
    key: () => 'createStoreFromEffect',
    fn: params.fn,
  });

  sample({
    clock: [$source, retry],
    source: $source,
    filter: nonNullableMap,
    fn: source => source as Args,
    target: fx,
  });

  // Any new attempt clears the previous verdict; an abort is a superseded run, not a failure.
  $error.reset(fx);

  sample({
    clock: fx.failData,
    filter: error => !isAbortError(error),
    target: $error,
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
    filter: error => !isAbortError(error),
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
    /** Last non-abort failure of `fn`; cleared when the next run starts. */
    $error: readonly($error),
    /** Re-runs `fn` with the current params (no-op while any of them is null). */
    retry,
    fx,
  };
};
