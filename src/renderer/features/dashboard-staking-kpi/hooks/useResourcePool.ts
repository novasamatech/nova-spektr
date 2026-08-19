import { useEffect, useMemo } from 'react';

import { type ResourceRequestKey } from '@/shared/query';

type PooledResource<Params> = {
  start: (params: Params) => void;
  stop: (key: ResourceRequestKey) => void;
  createKey: (params: Params) => ResourceRequestKey;
};

/**
 * `useResource` drives exactly one request; the KPI row needs a request per
 * staking chain, and the number of chains depends on the running config
 * (Westend Asset Hub only exists in dev). A list of hooks is impossible, so the
 * ref-counted pool is driven directly, the same way the staking-positions
 * aggregate does it — every `start` matched by a `stop` on the same key.
 */
export function useResourcePool<Params>(resource: PooledResource<Params>, requests: Params[]): void {
  const deduped = useMemo(() => {
    const map = new Map<ResourceRequestKey, Params>();
    for (const request of requests) {
      const key = resource.createKey(request);
      if (!map.has(key)) {
        map.set(key, request);
      }
    }

    return map;
  }, [requests, resource]);

  const signature = [...deduped.keys()].join('|');

  useEffect(() => {
    for (const request of deduped.values()) {
      resource.start(request);
    }

    return () => {
      for (const key of deduped.keys()) {
        resource.stop(key);
      }
    };
    // `deduped` is rebuilt whenever the caller passes a new array; the key
    // signature is what actually decides whether the subscriptions must change.
  }, [signature]);
}
