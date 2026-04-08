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

// Cache keyed by accountId; invalidates on block change or data reference change.
export function cachedEstimateClaimSchedule(
  accountId: string,
  params: Parameters<typeof claimScheduleService.estimateClaimSchedule>[0],
  votingRef: object,
  trackLocksRef: object,
  referendumsRef: object,
): Chunks[] {
  const entry = cache.get(accountId);

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
  cache.set(accountId, { block: params.currentBlockNumber, votingRef, trackLocksRef, referendumsRef, result });

  return result;
}
