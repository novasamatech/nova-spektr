import { type BN, BN_ZERO } from '@polkadot/util';

import { type Chunks, type ClaimAction, UnlockChunkType } from '@/shared/api/governance';
import { locksService } from '@/entities/governance';

/** One account's governance locks on one chain, folded from its claim schedule. */
export type AccountLockSummary = {
  /** The largest lock on the chain — never the sum of votes. */
  maxLock: BN;
  claimable: BN;
  /** The calls that release `claimable`; empty when nothing is claimable. */
  claimableActions: ClaimAction[];
  pending: BN;
  /**
   * Earliest block at which a pending lock releases; `null` when nothing is
   * pending.
   */
  nextUnlockBlock: number | null;
  delegated: BN;
  /** Track ids behind the lock, in first-seen order, no duplicates. */
  tracks: string[];
};

export function summarizeAccountLocks(schedule: Chunks[], maxLock: BN): AccountLockSummary {
  let claimable = BN_ZERO;
  let pending = BN_ZERO;
  let delegated = BN_ZERO;
  let nextUnlockBlock: number | null = null;
  const claimableActions: ClaimAction[] = [];
  const tracks = new Set<string>();

  for (const chunk of schedule) {
    if (chunk.type === UnlockChunkType.CLAIMABLE) {
      if (chunk.amount.isZero()) continue;
      claimable = claimable.add(chunk.amount);
      claimableActions.push(...chunk.actions);
      for (const action of chunk.actions) tracks.add(action.trackId);
    } else if (chunk.type === UnlockChunkType.PENDING_LOCK) {
      pending = pending.add(chunk.amount);
      if (locksService.isClaimAt(chunk.claimableAt)) {
        nextUnlockBlock =
          nextUnlockBlock === null ? chunk.claimableAt.block : Math.min(nextUnlockBlock, chunk.claimableAt.block);
      }
      for (const affect of chunk.affected) tracks.add(affect.trackId);
    } else {
      delegated = delegated.add(chunk.amount);
    }
  }

  return { maxLock, claimable, claimableActions, pending, nextUnlockBlock, delegated, tracks: [...tracks] };
}
