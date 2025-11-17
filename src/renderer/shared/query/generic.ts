import { createStore } from 'effector';

import { type DefaultCache, type KeyFn, type MapCacheFn, type NormalizedKeyFn, type ResourceRequestKey } from './types';

export function wrapKeyFactory<Params>(key: KeyFn<Params>): (params: Params) => ResourceRequestKey {
  return (params) => {
    const result = key(params);

    if (Array.isArray(result)) {
      return result.flat().toSorted().join(' ') as ResourceRequestKey;
    }

    return result as ResourceRequestKey;
  };
}

export function createDefaultCacheStore<Response>() {
  return createStore<DefaultCache<Response>>({});
}

export function createDefaultCacheMapper<Params, Response>(key: NormalizedKeyFn<Params>) {
  const map: MapCacheFn<Params, Response, DefaultCache<Response>> = (cache, result, params) => {
    return {
      ...cache,
      [key(params)]: result,
    };
  };

  return map;
}
