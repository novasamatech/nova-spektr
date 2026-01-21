import {
  type Effect,
  type EventCallable,
  type Store,
  type StoreWritable,
  createEffect,
  createEvent,
  createStore,
  sample,
  scopeBind,
} from 'effector';
import { readonly } from 'patronum';

import { createBuffer, createQueuedEffect } from '@/shared/effector';

import { createDefaultCacheMapper, createDefaultCacheStore, wrapKeyFactory } from './generic';
import { type KeyFn, type Resource, type ResourceRequestKey } from './types';

type MapCacheFn<Params, Response, Cache> = (cache: Cache, result: Response, params: Params) => Cache;

type DefaultCache<Response> = Record<ResourceRequestKey, Response>;

type CallbackFn<V> = (value: V) => unknown;
type UnsubscribeFn = (() => void) | Promise<() => void>;
type SubscribeFn<P, V> = (params: P, callback: CallbackFn<V>) => UnsubscribeFn;

/**
 * Configuration for DB cache integration with subscription resources.
 */
type DbCacheParams<Cache, Serialized, Item = Cache extends (infer T)[] ? T : Serialized> = {
  /** Storage service with readAll and insertAll methods */
  storage: {
    readAll(): Promise<Serialized[]>;
    insertAll(items: Serialized[]): Promise<unknown>;
  };
  /** Transform cache item for database storage */
  serialize: (item: Item) => Serialized;
  /** Transform item from database storage */
  deserialize: (item: Serialized) => Item;
  /** Buffer timeframe in ms before syncing to DB (default: 1000) */
  bufferMs?: number;
  /**
   * Custom function to merge DB data into cache. If not provided, DB data
   * replaces cache.
   */
  updateCache?: (cache: Cache, dbItems: Item[]) => Cache;
  /**
   * Extract items from cache for DB storage. Required if Cache is not an Array.
   */
  extractValues?: (cache: Cache) => Item[];
};

interface SubscriptionResource<Params, Response, Cache> extends Resource<Params, Response, Cache> {
  subscribe: EventCallable<Params>;
  unsubscribe: EventCallable<ResourceRequestKey>;
  /**
   * Effect to populate cache from DB. Call on startup. Only present if
   * .dbCache() was used.
   */
  populateFromDb?: Effect<void, unknown[]>;
  /**
   * Store indicating if DB population is complete. Only present if .dbCache()
   * was used.
   */
  $dbPopulated?: Store<boolean>;
}

type SubscriptionParams<
  Params,
  Response,
  Cache,
  Serialized = unknown,
  Item = Cache extends (infer T)[] ? T : Serialized,
> = {
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
  dbCache?: DbCacheParams<Cache, Serialized, Item>;
};

type CacheOrDefault<Cache, Response> = [Cache] extends [never] ? DefaultCache<Response> : Cache;

function build<Params, Response, Cache, Serialized, Item>({
  key,
  fn,
  cache,
  recreateOnSubscribe = false,
  dbCache,
}: SubscriptionParams<Params, Response, Cache, Serialized, Item>): SubscriptionResource<Params, Response, Cache> {
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

  const resource: SubscriptionResource<Params, Response, Cache> = {
    createKey,
    push: readonly(push),
    $cache: readonly(cache.store),
    subscribe: start,
    unsubscribe: stop,
    start,
    stop,
  };

  // Wire DB persistence if configured
  if (dbCache) {
    const { storage, serialize, deserialize, bufferMs = 1000 } = dbCache;

    // Populate from DB on startup
    const populateFromDbFx = createEffect(async () => {
      const items = await storage.readAll();
      return items.map(deserialize);
    });

    const $dbPopulated = createStore(false).on(populateFromDbFx.done, () => true);

    // Wire populate to cache store (merge with existing data)
    sample({
      clock: populateFromDbFx.doneData,
      source: cache.store,
      fn: (currentCache, dbItems) => {
        if (dbCache.updateCache) {
          // Use provided update function
          return dbCache.updateCache(currentCache, dbItems as any);
        }

        // Default: DB data replaces cache if cache is array
        if (Array.isArray(currentCache) && Array.isArray(dbItems)) {
          return dbItems as unknown as Cache;
        }

        return currentCache;
      },
      target: cache.store,
    });

    // Sync to DB with queuing (prevents race conditions)
    const syncToDbFx = createQueuedEffect(async (items: any[]) => {
      if (!Array.isArray(items) || items.length === 0) return;
      await storage.insertAll(items.map(serialize));
    });

    // Buffer rapid updates before syncing
    const bufferedSync = createBuffer({
      source: sample({ clock: cache.store.updates }),
      timeframe: bufferMs,
    });

    // Wire buffered sync to DB
    sample({
      clock: bufferedSync,
      source: cache.store,
      fn: (items) => {
        if (dbCache.extractValues) {
          return dbCache.extractValues(items);
        }

        return Array.isArray(items) ? items : [];
      },
      target: syncToDbFx,
    });

    resource.populateFromDb = populateFromDbFx as Effect<void, unknown[]>;
    resource.$dbPopulated = readonly($dbPopulated);
  }

  return resource;
}

export const createSubscriptionResource = <Params>({
  key,
  recreateOnSubscribe = false,
}: {
  key: KeyFn<Params>;
  recreateOnSubscribe?: boolean;
}) => {
  const internal = <
    Response = never,
    Cache = never,
    Serialized = unknown,
    Item = Cache extends (infer T)[] ? T : Serialized,
  >(
    params: Partial<SubscriptionParams<Params, Response, Cache, Serialized, Item>> = {},
  ) => {
    return {
      subscribe<Response>(fn: SubscribeFn<Params, Response>) {
        return internal<Response, Cache>({ ...params, fn } as Partial<SubscriptionParams<Params, Response, Cache>>);
      },
      cache<Cache>(cache: NonNullable<SubscriptionParams<Params, Response, Cache>['cache']>) {
        return internal<Response, Cache, Serialized>({ ...params, cache } as Partial<
          SubscriptionParams<Params, Response, Cache, Serialized>
        >);
      },
      dbCache<Serialized, Item = Cache extends (infer T)[] ? T : Serialized>(
        config: DbCacheParams<Cache, Serialized, Item>,
      ) {
        return internal<Response, Cache, Serialized, Item>({ ...params, dbCache: config } as Partial<
          SubscriptionParams<Params, Response, Cache, Serialized, Item>
        >);
      },
      build(): SubscriptionResource<Params, Response, CacheOrDefault<Cache, Response>> {
        if (!params.fn) {
          throw new Error('Missing subscription function');
        }

        if (params.cache) {
          return build<Params, Response, Cache, Serialized, Item>({
            cache: params.cache,
            key,
            fn: params.fn,
            recreateOnSubscribe,
            dbCache: params.dbCache,
          }) as SubscriptionResource<Params, Response, CacheOrDefault<Cache, Response>>;
        } else {
          const cacheStore = createDefaultCacheStore<Response>();
          const cacheMapper = createDefaultCacheMapper<Params, Response>(wrapKeyFactory(key));

          return build<Params, Response, DefaultCache<Response>, unknown, unknown>({
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
