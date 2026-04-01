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
  const key = useMemo(() => (params ? resource.createKey(params) : null), [params, resource]);

  const cachedValue = useStoreMap({
    store: resource.$cache,
    keys: [key],
    fn: (cache) => (nonNullable(params) ? (map(cache, params) ?? empty) : empty),
  });

  const normalizedValue = cachedValue === empty ? defaultValue : cachedValue;

  // Track which key has been resolved so that switching to an uncached key
  // correctly reports pending=true rather than immediately showing empty data.
  const [resolvedKey, setResolvedKey] = useState<typeof key>(null);
  const resolved = cachedValue !== empty || resolvedKey === key;
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
    if (cachedValue !== empty) {
      setResolvedKey((prev) => (prev === key ? prev : key));
    }
  }, [cachedValue, key]);

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    return resource.push.watch(({ params: pushedParams }) => {
      if (resource.createKey(pushedParams) === key) {
        setResolvedKey(key);
      }
    });
  }, [key]);

  return { data: normalizedValue, pending };
};
