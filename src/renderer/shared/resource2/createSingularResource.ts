import { type Effect, type StoreWritable, createEffect, sample } from 'effector';
import { readonly } from 'patronum';

import { createQueuedEffect } from '@/shared/effector';
import { createCache, nonNullable } from '@/shared/lib/utils';

import { createMutableResource } from './createMutableResource';
import { type Resource, type ResourceRequestKey } from './types';

type RemoteParams<Params, Response, Cache> = {
  name?: string;
  key(params: Params): string | string[];
  map(cache: Cache, result: Response, params: Params): Cache;
  request(params: { params: Params; signal: AbortSignal }): Response | Promise<Response>;
  cache: StoreWritable<Cache>;
  requestCacheTimeout?: number;
  retryCount?: number;
  retryDelay?: number;
};

interface RemoteResource<Params, Response, Cache> extends Resource<Params, Response, Cache> {
  request: Effect<Params, Response>;
}

export const createSingularResource = <Params, Response, Cache>({
  name = 'unknown',
  key,
  cache,
  requestCacheTimeout,
  retryCount,
  retryDelay,
  request,
  map,
}: RemoteParams<Params, Response, Cache>): RemoteResource<Params, Response, Cache> => {
  const requestsCache = createCache<ResourceRequestKey, Response>({ now: () => Date.now() });
  const abortControllers = new Map<ResourceRequestKey, AbortController>();

  const { domain, $cache, push, start, stop, createKey } = createMutableResource({
    name: `${name}/singular`,
    key,
    cache,
    map,
  });

  const requestFx = createQueuedEffect<Params, Response>(
    async (params) => {
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

      const response = request({ params, signal: abortController.signal });

      if (response instanceof Promise) {
        requestsCache.setRequest(key, response, requestCacheTimeout ?? 0);
      } else {
        requestsCache.set(key, response, requestCacheTimeout ?? 0);
      }

      return response;
    },
    { pool: createKey, retryCount, retryDelay, domain },
  );

  const abortFx = createEffect<ResourceRequestKey, void>((key) => {
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
    clock: stop,
    target: abortFx,
  });

  return {
    createKey,
    start,
    stop,
    push: readonly(push),
    $cache: readonly($cache),
    request: requestFx,
  };
};
