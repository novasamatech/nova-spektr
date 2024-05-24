import { BN } from '@polkadot/util';

import type { BlockHeight, ReferendumId, TrackId } from '@shared/core';

export type ClaimableLock = {
  claimAt: ClaimTime;
  amount: BN;
  // contains no duplicates
  affected: ClaimAffect[];
};

export interface ClaimAffect {
  trackId: TrackId;
  type: 'track' | 'vote';
}

export interface AffectTrack extends ClaimAffect {
  type: 'track';
}

export interface AffectVote extends ClaimAffect {
  type: 'vote';
  referendumId: ReferendumId;
}

export interface ClaimTime {
  type: 'at' | 'until';
}

export interface ClaimTimeAt extends ClaimTime {
  block: BlockHeight;
  type: 'at';
}

export interface ClaimTimeUntil extends ClaimTime {
  type: 'until';
}

export type GroupedClaimAffects = {
  trackId: TrackId;
  hasPriorAffect: Boolean;
  votes: AffectVote[];
};

// Claim action
export interface ClaimAction {
  type: 'unlock' | 'remove_vote';
}

export interface Unlock extends ClaimAction {
  type: 'unlock';
  trackId: TrackId;
}

export interface RemoveVote extends ClaimAction {
  type: 'remove_vote';
  trackId: TrackId;
  referendumId: ReferendumId;
}

// Unlock chunk
export interface UnlockChunk {
  type: 'claimable' | 'pending';
}

export interface ClaimableChunk extends UnlockChunk {
  type: 'claimable';
  amount: BN;
  actions: ClaimAction[];
}

export interface PendingChunk extends UnlockChunk {
  type: 'pending';
  amount: BN;
  claimableAt: ClaimTime;
}

export interface ClaimSchedule {
  chunks: UnlockChunk[];
}
