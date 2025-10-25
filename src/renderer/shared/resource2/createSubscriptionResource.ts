import { type EventCallable, type Scope, type StoreWritable, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { readonly } from 'patronum';

import { createMutableResource } from './createMutableResource';
import { type Resource, type ResourceRequestKey } from './types';

type CallbackFn<V> = (value: V) => unknown;
type UnsubscribeFn = (() => void) | Promise<() => void>;
type SubscribeFn<P, V> = (params: P, callback: CallbackFn<V>) => UnsubscribeFn;

interface SubscriptionResource<Params, Response, Cache> extends Resource<Params, Response, Cache> {
  subscribe: EventCallable<Params>;
  unsubscribe: EventCallable<ResourceRequestKey>;
}

type SubscriptionParams<Params, Response, Cache> = {
  name?: string;
  key(params: Params): string;
  fn: SubscribeFn<Params, Response>;
  cache: StoreWritable<Cache>;
  map(cache: Cache, result: Response, params: Params): Cache;
  // For testing purposes
  scope?: Scope;
};

const createSubscriptionResource = <Params, Response, Cache>({
  name = 'unknown',
  key,
  fn,
  cache,
  map,
  scope,
}: SubscriptionParams<Params, Response, Cache>): SubscriptionResource<Params, Response, Cache> => {
  const { domain, $cache, createKey, start, stop, push } = createMutableResource({
    name: `${name}/subscription`,
    cache,
    map,
    key,
  });

  const $subscriptions = domain.createStore<Record<ResourceRequestKey, UnsubscribeFn>>({});

  const subscribeFx = domain.createEffect<Params, UnsubscribeFn>((params) => {
    const boundPush = scopeBind(push, { scope });

    return fn(params, (result) => {
      boundPush({ params, result });
    });
  });

  const unsubscribeFx = domain.createEffect((fn: UnsubscribeFn | null) => {
    if (fn) {
      if (fn instanceof Promise) {
        return fn.then((x) => x());
      } else {
        return fn();
      }
    }
  });

  // call sub / unsub

  sample({
    clock: start,
    source: $subscriptions,
    filter: (subscriptions, params) => !(key(params) in subscriptions),
    fn: (_, params) => params,
    target: subscribeFx,
  });

  sample({
    clock: stop,
    source: $subscriptions,
    fn: (subscriptions, key) => subscriptions[key] ?? null,
    target: unsubscribeFx,
  });

  // manage subs pool

  sample({
    clock: subscribeFx.done,
    source: $subscriptions,
    fn: (subscriptions, { params, result }) => {
      return produce(subscriptions, (draft) => {
        draft[createKey(params)] = result;
      });
    },
    target: $subscriptions,
  });

  sample({
    clock: stop,
    source: $subscriptions,
    fn: (subscriptions, key) => {
      return produce(subscriptions, (draft) => {
        delete draft[key];
      });
    },
    target: $subscriptions,
  });

  return {
    createKey,
    push: readonly(push),
    $cache: readonly($cache),
    subscribe: start,
    unsubscribe: stop,
    start,
    stop,
  };
};

type RequestFn<Params, Response> = (params: Params, callback: (response: Response) => void) => void;
type MapCacheFn<Params, Response, Cache> = (cache: Cache, result: Response, params: Params) => Cache;

type BuilderParams<Params, Response, Cache> = {
  key: (params: Params) => string;
  fn: RequestFn<Params, Response>;
  store: StoreWritable<Cache>;
  map: MapCacheFn<Params, Response, Cache>;
};

type SubscribeResourceBuilder<Params, Response, Cache> = {
  subscribe<const Params, const Response>(params: {
    key: (params: Params) => string;
    fn: RequestFn<Params, Response>;
  }): SubscribeResourceBuilder<Params, Response, Cache>;
  cache<const Cache>(params: {
    store: StoreWritable<Cache>;
    map: MapCacheFn<Params, Response, Cache>;
  }): SubscribeResourceBuilder<Params, Response, Cache>;
  build(): Resource<Params, Response, Cache>;
};

export const createResource = <Params, Response, Cache>(
  params: Partial<BuilderParams<Params, Response, Cache>> = {},
) => {
  return {
    subscribe<Params, Response>({
      fn,
      key,
    }: {
      key: (params: Params) => string;
      fn: RequestFn<Params, Response>;
    }): SubscribeResourceBuilder<Params, Response, Cache> {
      return createResource<Params, Response, Cache>({ ...params, fn, key });
    },
    cache<Cache>({
      store,
      map,
    }: {
      store: StoreWritable<Cache>;
      map: MapCacheFn<Params, Response, Cache>;
    }): SubscribeResourceBuilder<Params, Response, Cache> {
      return createResource<Params, Response, Cache>({ ...params, store, map });
    },
    build(): Resource<Params, Response, Cache> {
      return createSubscriptionResource({
        cache: params.store,
        map: params.map,
        key: params.key,
        fn: params.fn,
      });
    },
  };
};

const a = createResource()
  .subscribe<{ a: 1 }, { b: 2 }>({
    key: (params) => params.a.toString(),
    fn: (params, callback) => {
      callback({ b: 2 });
    },
  })
  .build();
