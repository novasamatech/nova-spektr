import { type Domain, type EventCallable, type StoreWritable, createDomain, sample } from 'effector';

import { type ResourceRequestKey } from './types';

export interface MutableResource<Params, Response, Cache> {
  domain: Domain;

  push: EventCallable<{ params: Params; result: Response }>;
  start: EventCallable<Params>;
  stop: EventCallable<ResourceRequestKey>;
  $cache: StoreWritable<Cache>;

  createKey(params: Params): ResourceRequestKey;
}

type GenericParams<Params, Response, Cache> = {
  name: string;
  key(params: Params): string | string[];
  cache: StoreWritable<Cache>;
  map(cache: Cache, result: Response, params: Params): Cache;
};

export const createMutableResource = <Params, Response, Cache>({
  name,
  key,
  cache,
  map,
}: GenericParams<Params, Response, Cache>): MutableResource<Params, Response, Cache> => {
  const domain = createDomain({ name });

  const push = domain.createEvent<{ params: Params; result: Response }>();
  const start = domain.createEvent<Params>({ name: 'subscribe' });
  const stop = domain.createEvent<ResourceRequestKey>({ name: 'unsubscribe' });

  sample({
    clock: push,
    source: cache,
    fn: (cache, { result, params }) => map(cache, result, params),
    target: cache,
  });

  function createKey(params: Params): ResourceRequestKey {
    const result = key(params);

    if (Array.isArray(result)) {
      return result.join(' ') as ResourceRequestKey;
    }

    return result as ResourceRequestKey;
  }

  return {
    createKey,
    domain,
    push,
    $cache: cache,
    start,
    stop,
  };
};
