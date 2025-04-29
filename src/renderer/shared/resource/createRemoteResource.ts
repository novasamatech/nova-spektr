import { type Effect, createEffect, createEvent, sample, scopeBind } from 'effector';
import { readonly } from 'patronum';

import { createQueuedEffect } from '@/shared/effector';

import { type Resource } from './deriveFromResources';

type CacheParams<Params> = {
  key?(params: Params): string;
  ttl: number;
};

export const defaultRemoteCacheKey = (params: unknown) => {
  return JSON.stringify(params);
};

type RemoteParams<Params, Response> = {
  fn(params: Params): Response | Promise<Response>;
  pool?(params: Params): string;
  cache?: CacheParams<Params>;
  retryCount?: number;
  retryDelay?: number;
};

interface RemoteResource<Params, Response> extends Resource<Response, Response, Params | never> {
  request: Effect<Params, Awaited<Response>>;
}

export const createRemoteResource = <Params, Response>({
  pool = () => '_',
  cache,
  retryCount,
  retryDelay,
  fn,
}: RemoteParams<Params, Response>): RemoteResource<Params, Response> => {
  const cached: Record<string, { response: Response; ts: number }> = {};

  const getCacheKey = (params: Params) => {
    return cache?.key?.(params) ?? defaultRemoteCacheKey(params);
  };

  const pull = createEvent<{ meta: never; result: Response }>();
  const push = createEvent<{ meta: Params; result: Response }>();
  const queuedFx = createQueuedEffect<Params, Response>(fn, { pool, retryCount, retryDelay });

  const requestFx = createEffect(async (params: Params) => {
    const bound = scopeBind(queuedFx, { safe: true });

    if (cache) {
      const cacheKey = getCacheKey(params);
      const cachedValue = cached[cacheKey];
      if (cachedValue) {
        if (cache.ttl === Number.POSITIVE_INFINITY || cachedValue.ts + cache.ttl < Date.now()) {
          return cachedValue.response;
        } else {
          delete cached[cacheKey];
        }
      }
    }

    const request = bound(params);
    const response = await request;

    if (cache) {
      const cacheKey = getCacheKey(params);
      cached[cacheKey] = {
        response,
        ts: Date.now(),
      };
    }

    return response;
  });

  sample({
    clock: queuedFx.done,
    fn({ params, result }) {
      return {
        meta: params,
        result,
      };
    },
    target: push,
  });

  // redirecting data
  sample({
    clock: pull,
    target: push,
  });

  return {
    pull,
    push: readonly(push),
    // @ts-expect-error weird Awaited type error
    request: requestFx,
  };
};
