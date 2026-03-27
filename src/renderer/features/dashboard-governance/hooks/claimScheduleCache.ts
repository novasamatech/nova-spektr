import { type Chunks } from '@/shared/api/governance';
import { claimScheduleService } from '@/entities/governance';

type CacheEntry = {
  block: number;
  votingRef: object;
  trackLocksRef: object;
  result: Chunks[];
};

const cache = new Map<string, CacheEntry>();

// Cache keyed by accountId; invalidates on block change or data reference change.
export function cachedEstimateClaimSchedule(
  accountId: string,
  params: Parameters<typeof claimScheduleService.estimateClaimSchedule>[0],
  votingRef: object,
  trackLocksRef: object,
): Chunks[] {
  const entry = cache.get(accountId);

  if (
    entry &&
    entry.block === params.currentBlockNumber &&
    entry.votingRef === votingRef &&
    entry.trackLocksRef === trackLocksRef
  ) {
    return entry.result;
  }

  const result = claimScheduleService.estimateClaimSchedule(params);
  cache.set(accountId, { block: params.currentBlockNumber, votingRef, trackLocksRef, result });

  return result;
}
