import { useStoreMap } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';

import { type AnyResource } from './types';

const empty = Symbol('empty');

type ResourceParams<Params, Cache, Value> = {
  params: Params | undefined | null;
  defaultValue: Value;
  map(cache: Cache, params: Params): Value | undefined;
  filter?(value: NoInfer<Value>, params: NoInfer<Params>): boolean;
};

export const useResource = <const Params, Cache, const Value>(
  resource: AnyResource<Params, unknown, Cache>,
  { params, map, filter, defaultValue }: ResourceParams<Params, Cache, Value>,
) => {
  const [resolved, setResolved] = useState(false);
  const key = useMemo(() => (params ? resource.createKey(params) : null), [params, resource]);

  const cachedValue = useStoreMap({
    store: resource.$cache,
    keys: [key],
    fn: (cache) => (nonNullable(params) ? (map(cache, params) ?? empty) : empty),
  });

  const normalizedValue = cachedValue === empty ? defaultValue : cachedValue;
  const pending = !resolved;

  useEffect(() => {
    if (nonNullable(params) && nonNullable(key)) {
      if (nullable(filter) || filter(normalizedValue, params)) {
        resource.start(params);
        return () => {
          resource.stop(key);
        };
      }
    }
  }, [key]);

  useEffect(() => {
    setResolved((v) => v || cachedValue !== empty);

    // eslint-disable-next-line effector/no-watch
    return resource.push.watch(() => {
      setResolved(true);
    });
  }, [key]);

  return { data: normalizedValue, pending };
};
