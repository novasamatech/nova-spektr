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
  $pending: Store<Record<ResourceRequestKey, boolean>>;
}

type QueryParams<Params, Response, Cache> = {
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
    console.error('failed to fetch', error);
  });

  const requestFx = createQueuedEffect<Params, Response>(
    async (params) => {
      const boundedFn = scopeBind(fn, { safe: true });

      const key = createKey(params);
      const cached = await requestsCache.get(key);
      if (nonNullable(cached)) {
        return cached;
      }

      if (abortControllers.has(key)) {
        abortControllers.get(key)?.abort();
      }

      const abortController = new AbortController();
      abortControllers.set(key, abortController);

      const response = boundedFn(params, abortController.signal);

      if (response instanceof Promise) {
        requestsCache.setRequest(key, response, cache?.staleAfter ?? 0);
      } else {
        requestsCache.set(key, response, cache?.staleAfter ?? 0);
      }

      return response;
    },
    { pool: createKey, retryCount: retry?.count, retryDelay: retry?.delay },
  );

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

  return {
    createKey,
    push: readonly(push),
    $cache: readonly(cache.store),
    start,
    stop,

    fetch: requestFx,
    $pending: readonly($pending),
  };
}

export const createQueryResource = <Params>({ key }: { key: KeyFn<Params> }) => {
  const internal = <Response = never, Cache = never>(params: Partial<QueryParams<Params, Response, Cache>> = {}) => {
    return {
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
            cache: params.cache,
            key,
            retry: params.retry,
            fn: params.fn,
          });
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
          });
        }
      },
    };
  };

  return internal();
};
