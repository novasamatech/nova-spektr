import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

type FactoryParams<Params, Store, Response> = {
  initial: Store;
  fn(params: Params): Response | Promise<Response>;
  map(store: Store, params: { params: Params; result: Response }): Store;
};

export const createDataSource = <Store, Params, Response = Store>({
  initial,
  fn,
  map,
}: FactoryParams<Params, Store, Awaited<Response>>) => {
  const empty = Symbol();

  const $store = createStore<Store>(initial);
  const $fulfilled = createStore(false);
  const $lastParams = createStore<Params | symbol>(empty);
  const request = createEvent<Params>();
  const retry = createEvent();
  const fx = createEffect(fn);

  sample({
    clock: request,
    target: fx,
  });

  sample({
    clock: fx.fail,
    fn: ({ params }) => params,
    target: $lastParams,
  });

  sample({
    clock: fx.done,
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
    source: $store,
    fn: map,
    target: $store,
  });

  sample({
    clock: retry,
    source: $lastParams,
    filter: (value) => value !== empty,
    fn: (value) => value as Params,
    target: request,
  });

  return {
    $: readonly($store),

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
