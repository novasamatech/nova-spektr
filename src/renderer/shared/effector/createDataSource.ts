import {
  type Store,
  type StoreWritable,
  type UnitTargetable,
  attach,
  createEffect,
  createEvent,
  createStore,
  is,
  sample,
} from 'effector';
import { readonly } from 'patronum';

import { type XOR } from '@/shared/core';

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
  fn(params: Params): Response | Promise<Response>;
  map(store: Source, params: { params: Params; result: Response }): Target;
  mutateParams?(params: Params, store: Source): Params;
  filter?(params: Params, store: Source): boolean;
};

export const createDataSource = <Source, Params, Response = Source, Target = Source>({
  initial,
  source,
  target,
  fn,
  map,
  filter = () => true,
  mutateParams = (params) => params,
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
  const fx = createEffect(fn);

  const request = attach({
    source: $source,
    effect: (store: Source, params: Params) => {
      const mutatedParams = mutateParams(params, store);

      if (filter(mutatedParams, store)) {
        return fx(mutatedParams).then(() => undefined);
      }

      return Promise.resolve(undefined);
    },
  });

  sample({
    clock: fx.fail,
    fn: ({ params }) => params,
    target: $lastParams,
  });

  sample({
    clock: fx,
    fn: () => empty,
    target: $lastParams,
  });

  sample({
    clock: fx.done,
    fn: () => true,
    target: $fulfilled,
  });

  sample({
    clock: fx.done,
    source: $source,
    fn: map,
    target: targetUnit,
  });

  sample({
    clock: retry,
    source: $lastParams,
    filter: (value) => value !== empty,
    fn: (value) => value as Params,
    target: request,
  });

  return {
    $: readonly($source),

    fulfilled: readonly($fulfilled),

    request,
    retry,

    pending: fx.pending,
    done: fx.done,
    doneData: fx.doneData,
    fail: fx.fail,
    failData: fx.failData,
    finally: fx.finally,
  };
};
