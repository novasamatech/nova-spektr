import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef } from 'react';

import { type ResourceRequestKey } from '@/shared/query';
import { type VestingChainRequest, type VestingData, vestingSchedulesResource } from '@/domains/vesting';

type VestingSchedulesResult = {
  data: VestingData;
  /** No requested chain has reported yet — nothing to show, but not yet empty. */
  pending: boolean;
};

const EMPTY: VestingData = { schedules: {}, locks: {} };

/**
 * Subscribes to vesting schedules and locks for a dynamic set of chains, one
 * pooled subscription per chain. The chain set grows as chains connect; only
 * the chains that changed (re)subscribe, the rest stay put. The shared cache
 * keeps a chain's last value while it re-subscribes, so content never collapses
 * mid-update — and a claim landing on-chain flows in without a manual refetch.
 */
export const useVestingSchedules = (requests: VestingChainRequest[] | null): VestingSchedulesResult => {
  const cache = useUnit(vestingSchedulesResource.$cache);

  const list = requests ?? [];
  const requestsKey = list
    .map((request) => vestingSchedulesResource.createKey(request))
    .sort()
    .join('|');

  const keyedRequests = useMemo(() => {
    const map = new Map<ResourceRequestKey, VestingChainRequest>();
    for (const request of list) {
      map.set(vestingSchedulesResource.createKey(request), request);
    }

    return map;
    // `list` is a fresh array each render; the stable identity is the key set.
  }, [requestsKey]);

  // Keys this hook instance currently holds a subscription for. The resource is
  // ref-counted, so overlapping instances share one subscription per key.
  const activeKeys = useRef<Set<ResourceRequestKey>>(new Set());

  useEffect(() => {
    const active = activeKeys.current;

    for (const [key, request] of keyedRequests) {
      if (!active.has(key)) {
        active.add(key);
        vestingSchedulesResource.subscribe(request);
      }
    }

    for (const key of [...active]) {
      if (!keyedRequests.has(key)) {
        active.delete(key);
        vestingSchedulesResource.unsubscribe(key);
      }
    }
  }, [keyedRequests]);

  // Drop every remaining subscription on unmount.
  useEffect(() => {
    return () => {
      for (const key of activeKeys.current) {
        vestingSchedulesResource.unsubscribe(key);
      }
      activeKeys.current.clear();
    };
  }, []);

  return useMemo(() => {
    if (keyedRequests.size === 0) return { data: EMPTY, pending: false };

    const schedules: VestingData['schedules'] = {};
    const locks: VestingData['locks'] = {};
    let pending = false;

    for (const { chain } of keyedRequests.values()) {
      const entry = cache[chain.chainId];
      if (!entry) {
        pending = true;
        continue;
      }

      // Only surface chains that actually hold a schedule — an empty entry means
      // "reported, nothing here" and must not read as an active schedule.
      if (Object.keys(entry.schedules).length > 0) schedules[chain.chainId] = entry.schedules;
      if (Object.keys(entry.locks).length > 0) locks[chain.chainId] = entry.locks;
    }

    return { data: { schedules, locks }, pending };
  }, [cache, keyedRequests]);
};
