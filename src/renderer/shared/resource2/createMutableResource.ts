import { type StoreWritable, createDomain, sample } from 'effector';

import { type MutableResource, type ResourceRequestKey } from './types';

type GenericParams<Params, Response, Cache> = {
  name: string;
  key(params: Params): string;
  cache: StoreWritable<Cache>;
  toCache(cache: Cache, result: Response, params: Params): Cache;
};

export const createMutableResource = <Params, Response, Cache>({
  name,
  key,
  cache,
  toCache,
}: GenericParams<Params, Response, Cache>): MutableResource<Params, Response, Cache> => {
  const domain = createDomain({ name });

  const push = domain.createEvent<{ params: Params; result: Response }>();
  const start = domain.createEvent<Params>({ name: 'subscribe' });
  const stop = domain.createEvent<ResourceRequestKey>({ name: 'unsubscribe' });

  sample({
    clock: push,
    source: cache,
    fn: (cache, { result, params }) => toCache(cache, result, params),
    target: cache,
  });

  return {
    createKey: (params) => key(params) as ResourceRequestKey,
    domain,
    push,
    $cache: cache,
    start,
    stop,
  };
};
