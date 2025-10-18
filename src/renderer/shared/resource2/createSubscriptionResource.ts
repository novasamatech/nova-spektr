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
  key(params: Params): ResourceRequestKey;
  fn: SubscribeFn<Params, Response>;
  cache: StoreWritable<Cache>;
  store(cache: Cache, result: Response, params: Params): Cache;
  // For testing purposes
  scope?: Scope;
};

export const createSubscriptionResource = <Params, Response, Cache>({
  name = 'unknown',
  key,
  fn,
  cache,
  store,
  scope,
}: SubscriptionParams<Params, Response, Cache>): SubscriptionResource<Params, Response, Cache> => {
  const { domain, $cache, createKey, start, stop, push } = createMutableResource({
    name: `${name}/subscription`,
    cache,
    toCache: store,
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

  // map to cache

  sample({
    clock: push,
    source: cache,
    fn: (cache, { result, params }) => store(cache, result, params),
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
