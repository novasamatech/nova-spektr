import { useStoreMap } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { nonNullable } from '@/shared/lib/utils';

import { type AnyResource } from './types';

type ResourceParams<Params, Cache, Value> = {
  params: Params | null;
  defaultValue: Value;
  map(cache: Cache, params: Params): Value | undefined;
};

export const useResource = <const Params, Cache, Value>(
  resource: AnyResource<Params, any, Cache>,
  { params, map, defaultValue }: ResourceParams<Params, Cache, Value>,
) => {
  const key = useMemo(() => (params ? resource.createKey(params) : null), [params, resource]);

  const data = useStoreMap({
    store: resource.$cache,
    keys: [key, defaultValue],
    fn: (cache) => (nonNullable(params) ? (map(cache, params) ?? defaultValue) : defaultValue),
  });

  const pending = data === defaultValue;

  useEffect(() => {
    if (nonNullable(params) && nonNullable(key)) {
      resource.start(params);
      return () => {
        resource.stop(key);
      };
    }
  }, [key]);

  return { data, pending };
};
