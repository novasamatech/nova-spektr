import { BN, BN_ZERO } from '@polkadot/util';

import { type Chunks, type ClaimAction, UnlockChunkType } from '@/shared/api/governance';
import { type Conviction, type TrackId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { locksService } from '@/entities/governance';

/** One delegation of the account on one track, as the chain holds it. */
export type Delegation = {
  trackId: TrackId;
  target: AccountId;
  balance: BN;
  conviction: Conviction;
};

/** One account's governance locks on one chain, folded from its claim schedule. */
export type AccountLockSummary = {
  /**
   * The largest lock on the chain — never the sum of votes. Fed by
   * `getLockedAmount`, so it stays non-zero for a class lock that outlived its
   * votes.
   */
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
  /** The delegations behind `delegated`, in track order. */
  delegations: Delegation[];
  /** Track ids behind the lock, in first-seen order, no duplicates. */
  tracks: string[];
};

/**
 * What the chain actually freezes for the account: the largest of its
 * `classLocksFor` entries, or of its votes when the class locks lag behind
 * (they are updated only by `unlock`). Votes alone miss the common case of a
 * vote removed without an `unlock` — the class lock stays, and it is exactly
 * the amount a permissionless `unlock` releases.
 */
export function getLockedAmount(votesMaxLock: BN, trackLocks: Record<TrackId, BN>): BN {
  return Object.values(trackLocks).reduce((max, lock) => BN.max(max, lock), votesMaxLock);
}

export function summarizeAccountLocks(schedule: Chunks[], maxLock: BN, delegations: Delegation[]): AccountLockSummary {
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

  for (const delegation of delegations) tracks.add(delegation.trackId);

  return {
    maxLock,
    claimable,
    claimableActions,
    pending,
    nextUnlockBlock,
    delegated,
    delegations,
    tracks: [...tracks],
  };
}
