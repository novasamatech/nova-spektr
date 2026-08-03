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

import { createQueuedEffect } from '@/shared/effector';
import { createCache, nonNullable } from '@/shared/lib/utils';

import { createDefaultCacheMapper, createDefaultCacheStore, wrapKeyFactory } from './generic';
import { type DefaultCache, type KeyFn, type MapCacheFn, type Resource, type ResourceRequestKey } from './types';

type RequestFn<Params, Response> = (params: Params, signal: AbortSignal) => Response | Promise<Response>;

interface QueryResource<Params, Response, Cache> extends Resource<Params, Response, Cache> {
  fetch: Effect<Params, Response>;
  /**
   * Drops the in-memory response for a key so the next `fetch`/`start` really
   * goes to the network instead of being answered from the `staleAfter`
   * window.
   *
   * Needed when something outside the resource is known to have changed the
   * answer — a transaction landing on chain, say — well before the TTL is up.
   * Without it a refetch inside the window is a no-op: the request cache
   * short-circuits it and `$cache` never gets a new value pushed into it.
   */
  invalidate: Effect<Params, void>;
  $pending: Store<Record<ResourceRequestKey, boolean>>;
}

type QueryParams<Params, Response, Cache> = {
  name?: string;
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
  // TODO support batching
  batch?: {
    frame: number;
    key(params: Params): string;
  };
};

type CacheOrDefault<Cache, Response> = [Cache] extends [never] ? DefaultCache<Response> : Cache;

function build<Params, Response, Cache>({
  name,
  key,
  fn,
  retry,
  cache,
}: QueryParams<Params, Response, Cache>): QueryResource<Params, Response, Cache> {
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
    console.error(`Failed to fetch resource ${name ?? ''}`, error);
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

  const invalidateFx = createEffect((params: Params) => {
    requestsCache.delete(createKey(params));
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

  // Per-key in-flight tracking. `requestFx` is pooled by key, so a second
  // request for a key already in flight joins the running one instead of
  // starting another - the flag simply stays raised until it settles.
  $pending
    .on(requestFx, (pending, params) => ({ ...pending, [createKey(params)]: true }))
    .on([requestFx.done, requestFx.fail], (pending, { params }) => {
      const key = createKey(params);
      if (!pending[key]) return pending;

      const { [key]: _settled, ...rest } = pending;

      return rest;
    })
    .on(abortFx, (pending, key) => {
      if (!pending[key]) return pending;

      const { [key]: _aborted, ...rest } = pending;

      return rest;
    });

  return {
    createKey,
    push: readonly(push),
    $cache: readonly(cache.store),
    start,
    stop,

    fetch: fetchFx,
    invalidate: invalidateFx,
    $pending: readonly($pending),
  };
}

export const createQueryResource = <Params>({ key }: { key: KeyFn<Params> }) => {
  const internal = <Response = never, Cache = never>(params: Partial<QueryParams<Params, Response, Cache>> = {}) => {
    return {
      name(name: string) {
        return internal<Response, Cache>({ ...params, name } as Partial<QueryParams<Params, Response, Cache>>);
      },
      request<Response>(fn: RequestFn<Params, Response>) {
        return internal<Response, Cache>({ ...params, fn, key } as Partial<QueryParams<Params, Response, Cache>>);
      },
      retry(retry: NonNullable<QueryParams<Params, Response, Cache>>['retry']) {
        return internal<Response, Cache>({ ...params, retry } as Partial<QueryParams<Params, Response, Cache>>);
      },
      cache<Cache>(cache: NonNullable<QueryParams<Params, Response, Cache>['cache']>) {
        return internal<Response, Cache>({ ...params, cache } as Partial<QueryParams<Params, Response, Cache>>);
      },
      build(): QueryResource<Params, Response, CacheOrDefault<Cache, Response>> {
        if (!params.fn) {
          throw new Error('Missing request function');
        }

        if (params.cache) {
          return build<Params, Response, Cache>({
            name: params.name,
            cache: params.cache,
            key,
            retry: params.retry,
            fn: params.fn,
          }) as QueryResource<Params, Response, CacheOrDefault<Cache, Response>>;
        } else {
          const cacheStore = createDefaultCacheStore<Response>();
          const cacheMapper = createDefaultCacheMapper<Params, Response>(wrapKeyFactory(key));

          return build<Params, Response, DefaultCache<Response>>({
            name: params.name,
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
