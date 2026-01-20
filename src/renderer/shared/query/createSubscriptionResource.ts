import { type EventCallable, type StoreWritable, createEffect, createEvent, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { createDefaultCacheMapper, createDefaultCacheStore, wrapKeyFactory } from './generic';
import { type KeyFn, type Resource, type ResourceRequestKey } from './types';

type MapCacheFn<Params, Response, Cache> = (cache: Cache, result: Response, params: Params) => Cache;

type DefaultCache<Response> = Record<ResourceRequestKey, Response>;

type CallbackFn<V> = (value: V) => unknown;
type UnsubscribeFn = (() => void) | Promise<() => void>;
type SubscribeFn<P, V> = (params: P, callback: CallbackFn<V>) => UnsubscribeFn;

interface SubscriptionResource<Params, Response, Cache> extends Resource<Params, Response, Cache> {
  subscribe: EventCallable<Params>;
  unsubscribe: EventCallable<ResourceRequestKey>;
}

type SubscriptionParams<Params, Response, Cache> = {
  fn: SubscribeFn<Params, Response>;
  key: KeyFn<Params>;
  cache: {
    store: StoreWritable<Cache>;
    map: MapCacheFn<Params, Response, Cache>;
  };
  /**
   * When true, unsubscribes and recreates subscription on every subscribe call,
   * even if key already exists
   */
  recreateOnSubscribe?: boolean;
};

type CacheOrDefault<Cache, Response> = [Cache] extends [never] ? DefaultCache<Response> : Cache;

function build<Params, Response, Cache>({
  key,
  fn,
  cache,
  recreateOnSubscribe = false,
}: SubscriptionParams<Params, Response, Cache>): SubscriptionResource<Params, Response, Cache> {
  const createKey = wrapKeyFactory(key);

  const push = createEvent<{ params: Params; result: Response }>();
  const start = createEvent<Params>({ name: 'subscribe' });
  const stop = createEvent<ResourceRequestKey>({ name: 'unsubscribe' });

  sample({
    clock: push,
    source: cache.store,
    fn: (value, { result, params }) => cache.map(value, result, params),
    target: cache.store,
  });

  const subscriptions: Record<ResourceRequestKey, { unsubscribe: UnsubscribeFn; count: number }> = {};

  const logFailFx = createEffect((error: Error) => {
    console.error('failed to subscribe', error);
  });

  const subscribeFx = createEffect(async (params: Params) => {
    const boundPush = scopeBind(push, { safe: true });
    const subKey = createKey(params);

    let sub = subscriptions[subKey];
    if (sub) {
      if (recreateOnSubscribe) {
        // Unsubscribe from existing subscription before recreating
        if (sub.unsubscribe instanceof Promise) {
          const unsub = await sub.unsubscribe;
          unsub();
        } else {
          sub.unsubscribe();
        }
        delete subscriptions[subKey];
      } else {
        sub.count++;
        return;
      }
    }

    const unsubscribe = fn(params, (result) => {
      boundPush({ params, result });
    });

    sub = {
      unsubscribe,
      count: 1,
    };
    subscriptions[subKey] = sub;
  });

  const unsubscribeFx = createEffect((key: ResourceRequestKey) => {
    const sub = subscriptions[key];
    if (!sub) {
      return;
    }

    sub.count--;
    if (sub.count === 0) {
      delete subscriptions[key];

      if (sub.unsubscribe instanceof Promise) {
        return sub.unsubscribe.then((x) => x());
      } else {
        return sub.unsubscribe();
      }
    }
  });

  // call sub / unsub

  sample({
    clock: start,
    target: subscribeFx,
  });

  sample({
    clock: subscribeFx.failData,
    target: logFailFx,
  });

  sample({
    clock: stop,
    target: unsubscribeFx,
  });

  // manage subs pool

  return {
    createKey,
    push: readonly(push),
    $cache: readonly(cache.store),
    subscribe: start,
    unsubscribe: stop,
    start,
    stop,
  };
}

export const createSubscriptionResource = <Params>({
  key,
  recreateOnSubscribe = false,
}: {
  key: KeyFn<Params>;
  recreateOnSubscribe?: boolean;
}) => {
  const internal = <Response = never, Cache = never>(
    params: Partial<SubscriptionParams<Params, Response, Cache>> = {},
  ) => {
    return {
      subscribe<Response>(fn: SubscribeFn<Params, Response>) {
        return internal<Response, Cache>({ ...params, fn } as Partial<SubscriptionParams<Params, Response, Cache>>);
      },
      cache<Cache>(cache: NonNullable<SubscriptionParams<Params, Response, Cache>['cache']>) {
        return internal<Response, Cache>({ ...params, cache } as Partial<SubscriptionParams<Params, Response, Cache>>);
      },
      build(): SubscriptionResource<Params, Response, CacheOrDefault<Cache, Response>> {
        if (!params.fn) {
          throw new Error('Missing subscription function');
        }

        if (params.cache) {
          return build<Params, Response, Cache>({
            cache: params.cache,
            key,
            fn: params.fn,
            recreateOnSubscribe,
          }) as SubscriptionResource<Params, Response, CacheOrDefault<Cache, Response>>;
        } else {
          const cacheStore = createDefaultCacheStore<Response>();
          const cacheMapper = createDefaultCacheMapper<Params, Response>(wrapKeyFactory(key));

          return build<Params, Response, DefaultCache<Response>>({
            cache: {
              store: cacheStore,
              map: cacheMapper,
            },
            key,
            fn: params.fn,
            recreateOnSubscribe,
          }) as SubscriptionResource<Params, Response, CacheOrDefault<Cache, Response>>;
        }
      },
    };
  };

  return internal();
};
