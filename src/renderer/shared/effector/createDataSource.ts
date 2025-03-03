import {
  type Store,
  type StoreWritable,
  type UnitTargetable,
  createEffect,
  createEvent,
  createStore,
  is,
  sample,
} from 'effector';
import { readonly } from 'patronum';

import { type XOR } from '@/shared/core';

import { createQueuedEffect } from './createQueuedEffect';

type Units<Source, Target> = XOR<
  {
    initial: Source | StoreWritable<Source>;
  },
  {
    source: Store<Source>;
    target: UnitTargetable<Target>;
  }
>;

type FactoryParams<Params, Source, Response, Target> = Units<Source, Target> & {
  fn(params: Params, source: Source): Response | Promise<Response>;
  map(source: Source, params: { params: Params; result: Response }): Target;
  mutateParams?(params: Params, store: Source): Params;
  cache?(params: Params, store: Source): Response | false;
  pool?(params: Params): string | undefined;
};

type RequestResult<V> = {
  value: Awaited<V>;
  cacheHit: boolean;
};

export const createDataSource = <Source, Params, Response = Source, Target = Source>({
  initial,
  source,
  target,
  fn,
  map,
  cache = () => false,
  pool = () => undefined,
  mutateParams = params => params,
}: FactoryParams<Params, Source, Awaited<Response>, Target>) => {
  const empty = Symbol();

  let $source: Store<Source>;
  let targetUnit: UnitTargetable<Target>;

  if (initial) {
    $source = is.store(initial) ? initial : createStore<Source>(initial);
    targetUnit = $source as unknown as UnitTargetable<Target>;
  } else if (source && target) {
    $source = source;
    targetUnit = target;
  } else {
    throw new Error("fields initial, source or target aren't passed");
  }

  const $fulfilled = createStore(false);
  const $lastParams = createStore<Params | symbol>(empty);
  const retry = createEvent();

  const fx = createEffect(async (params: Params): Promise<RequestResult<Response>> => {
    // eslint-disable-next-line effector/no-getState
    const source = $source.getState();
    const mutatedParams = mutateParams(params, source);
    const cached = cache(mutatedParams, source);

    if (cached !== false) {
      return { value: cached, cacheHit: true };
    }

    const value = await fn(mutatedParams, source);

    return { value: value, cacheHit: false };
  });

  const request = createQueuedEffect(
    (params: Params) => {
      return fx(params).then(({ value }) => value);
    },
    { pool },
  );

  sample({
    clock: request.fail,
    fn: ({ params }) => params,
    target: $lastParams,
  });

  sample({
    clock: request,
    fn: () => empty,
    target: $lastParams,
  });

  sample({
    clock: request.done,
    fn: () => true,
    target: $fulfilled,
  });

  sample({
    clock: fx.done,
    source: $source,
    filter: (_, { result }) => !result.cacheHit,
    fn: (source, { params, result }) => map(source, { params, result: result.value }),
    target: targetUnit,
  });

  sample({
    clock: retry,
    source: $lastParams,
    filter: value => value !== empty,
    fn: value => value as Params,
    target: request,
  });

  return {
    $: readonly($source),

    fulfilled: readonly($fulfilled),

    request,
    retry,

    pending: request.pending,
    done: request.done,
    doneData: request.doneData,
    fail: request.fail,
    failData: request.failData,
    finally: request.finally,
  };
};
