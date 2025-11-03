import { useStoreMap } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';

import { type AnyResource } from './types';

type ResourceParams<Params, Cache, Value> = {
  params: Params | undefined | null;
  defaultValue: Value;
  map(cache: Cache, params: Params): Value | undefined;
  filter?(value: NoInfer<Value>, params: NoInfer<Params>): boolean;
};

export const useResource = <const Params, Cache, const Value>(
  resource: AnyResource<Params, any, Cache>,
  { params, map, filter, defaultValue }: ResourceParams<Params, Cache, Value>,
) => {
  const key = useMemo(() => (params ? resource.createKey(params) : null), [params, resource]);

  const data = useStoreMap({
    store: resource.$cache,
    keys: [key, defaultValue],
    fn: (cache) => (nonNullable(params) ? (map(cache, params) ?? defaultValue) : defaultValue),
  });

  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (nonNullable(params) && nonNullable(key)) {
      if (nullable(filter) || filter(data, params)) {
        resource.start(params);
        return () => {
          resource.stop(key);
        };
      }
    }
  }, [key]);

  useEffect(() => {
    setPending(data === defaultValue);

    // eslint-disable-next-line effector/no-watch
    return resource.push.watch(() => setPending(false));
  }, [key]);

  return { data, pending };
};
