import {
  type Effect,
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
import { createCache, nonNullable } from '@/shared/lib/utils';

import { createDefaultCacheMapper, createDefaultCacheStore, wrapKeyFactory } from './generic';
import { type DefaultCache, type KeyFn, type MapCacheFn, type Resource, type ResourceRequestKey } from './types';

type RequestFn<Params, Response> = (params: Params, signal: AbortSignal) => Response | Promise<Response>;

/**
 * Configuration for DB cache integration with query resources.
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

interface QueryResource<Params, Response, Cache> extends Resource<Params, Response, Cache> {
  fetch: Effect<Params, Response>;
  $pending: Store<Record<ResourceRequestKey, boolean>>;
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

type QueryParams<Params, Response, Cache, Serialized = unknown, Item = Cache extends (infer T)[] ? T : Serialized> = {
  fn: RequestFn<Params, Response>;
  key: KeyFn<Params>;
  cache: {
    store: StoreWritable<Cache>;
    map: MapCacheFn<Params, Response, Cache>;
    staleAfter?: number;
  };
  retry?: {
    count: number;
    delay: number;
  };
  dbCache?: DbCacheParams<Cache, Serialized, Item>;
  // TODO support batching
  batch?: {
    frame: number;
    key(params: Params): string;
  };
};

type CacheOrDefault<Cache, Response> = [Cache] extends [never] ? DefaultCache<Response> : Cache;

function build<Params, Response, Cache, Serialized, Item>({
  key,
  fn,
  retry,
  cache,
  dbCache,
}: QueryParams<Params, Response, Cache, Serialized, Item>): QueryResource<Params, Response, Cache> {
  const createKey = wrapKeyFactory(key);

  const push = createEvent<{ params: Params; result: Response }>();
  const start = createEvent<Params>({ name: 'request' });
  const stop = createEvent<ResourceRequestKey>({ name: 'abort' });

  sample({
    clock: push,
    source: cache.store,
    fn: (value, { result, params }) => cache.map(value, result, params),
    target: cache.store,
  });

  const requestsCache = createCache<ResourceRequestKey, Response>({ now: () => Date.now() });
  const abortControllers = new Map<ResourceRequestKey, AbortController>();

  const $pending = createStore<Record<ResourceRequestKey, boolean>>({});

  const logFailFx = createEffect((error: Error) => {
    console.error('Failed to fetch', error);
  });

  const requestFx = createQueuedEffect<Params, { cached: boolean; response: Response }>(
    async (params) => {
      const boundedFn = scopeBind(fn, { safe: true });

      const key = createKey(params);
      const cached = await requestsCache.get(key);
      if (nonNullable(cached)) {
        return { cached: true, response: cached };
      }

      if (abortControllers.has(key)) {
        abortControllers.get(key)?.abort();
      }

      const abortController = new AbortController();
      abortControllers.set(key, abortController);

      try {
        const response = boundedFn(params, abortController.signal);
        const value = await requestsCache.setAny(key, response, cache?.staleAfter ?? 0);

        return { cached: false, response: value.value };
      } finally {
        abortControllers.delete(key);
      }
    },
    { pool: createKey, retryCount: retry?.count, retryDelay: retry?.delay },
  );

  const fetchFx = createEffect<Params, Response>((params) => {
    const bounded = scopeBind(requestFx, { safe: true });

    return bounded(params).then(({ response }) => response);
  });

  const abortFx = createEffect((key: ResourceRequestKey) => {
    const abortController = abortControllers.get(key);
    if (abortController) {
      abortController.abort('Cancelled');
      abortControllers.delete(key);
    }
  });

  sample({
    clock: start,
    target: requestFx,
  });

  sample({
    clock: requestFx.done,
    filter: ({ result }) => !result.cached,
    fn: ({ params, result }) => ({ params, result: result.response }),
    target: push,
  });

  sample({
    clock: requestFx.failData,
    target: logFailFx,
  });

  sample({
    clock: stop,
    target: abortFx,
  });

  const resource: QueryResource<Params, Response, Cache> = {
    createKey,
    push: readonly(push),
    $cache: readonly(cache.store),
    start,
    stop,

    fetch: fetchFx,
    $pending: readonly($pending),
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

export const createQueryResource = <Params>({ key }: { key: KeyFn<Params> }) => {
  const internal = <
    Response = never,
    Cache = never,
    Serialized = unknown,
    Item = Cache extends (infer T)[] ? T : Serialized,
  >(
    params: Partial<QueryParams<Params, Response, Cache, Serialized, Item>> = {},
  ) => {
    return {
      request<Response>(fn: RequestFn<Params, Response>) {
        return internal<Response, Cache, Serialized, Item>({
          ...params,
          fn,
          key,
        } as Partial<QueryParams<Params, Response, Cache, Serialized, Item>>);
      },
      retry(retry: NonNullable<QueryParams<Params, Response, Cache>>['retry']) {
        return internal<Response, Cache, Serialized, Item>({ ...params, retry } as Partial<
          QueryParams<Params, Response, Cache, Serialized, Item>
        >);
      },
      cache<Cache>(cache: NonNullable<QueryParams<Params, Response, Cache>['cache']>) {
        return internal<Response, Cache, Serialized, Item>({ ...params, cache } as Partial<
          QueryParams<Params, Response, Cache, Serialized, Item>
        >);
      },
      dbCache<Serialized, Item = Cache extends (infer T)[] ? T : Serialized>(
        config: DbCacheParams<Cache, Serialized, Item>,
      ) {
        return internal<Response, Cache, Serialized, Item>({ ...params, dbCache: config } as Partial<
          QueryParams<Params, Response, Cache, Serialized, Item>
        >);
      },
      build(): QueryResource<Params, Response, CacheOrDefault<Cache, Response>> {
        if (!params.fn) {
          throw new Error('Missing request function');
        }

        if (params.cache) {
          return build<Params, Response, Cache, Serialized, Item>({
            cache: params.cache,
            key,
            retry: params.retry,
            fn: params.fn,
            dbCache: params.dbCache,
          }) as QueryResource<Params, Response, CacheOrDefault<Cache, Response>>;
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
          }) as QueryResource<Params, Response, CacheOrDefault<Cache, Response>>;
        }
      },
    };
  };

  return internal();
};
