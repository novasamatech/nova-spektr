import { type Chunks } from '@/shared/api/governance';
import { claimScheduleService } from '@/entities/governance';

type CacheEntry = {
  block: number;
  votingRef: object;
  trackLocksRef: object;
  referendumsRef: object;
  result: Chunks[];
};

const cache = new Map<string, CacheEntry>();

// Stable empty reference for accounts with no track locks — prevents cache misses
// from `trackLocks[accountId] ?? {}` creating a new object each time.
export const EMPTY_TRACK_LOCKS: Record<string, never> = {};

/**
 * Keyed by chain _and_ account; invalidates on block change or data reference
 * change. The chain has to be in the key: the same account is scheduled once
 * per Asset Hub, and an accountId-only key had the two chains overwrite each
 * other's entry on every pass, so the cache almost never hit.
 */
export function cachedEstimateClaimSchedule(
  chainId: string,
  accountId: string,
  params: Parameters<typeof claimScheduleService.estimateClaimSchedule>[0],
  votingRef: object,
  trackLocksRef: object,
  referendumsRef: object,
): Chunks[] {
  const key = `${chainId}:${accountId}`;
  const entry = cache.get(key);

  if (
    entry &&
    entry.block === params.currentBlockNumber &&
    entry.votingRef === votingRef &&
    entry.trackLocksRef === trackLocksRef &&
    entry.referendumsRef === referendumsRef
  ) {
    return entry.result;
  }

  const result = claimScheduleService.estimateClaimSchedule(params);
  cache.set(key, { block: params.currentBlockNumber, votingRef, trackLocksRef, referendumsRef, result });

  return result;
}
