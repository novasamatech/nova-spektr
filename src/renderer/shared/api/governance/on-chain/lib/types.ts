import { BN } from '@polkadot/util';

import type { BlockHeight, ReferendumId, TrackId } from '@shared/core';

export type ClaimableLock = {
  claimAt: ClaimTime;
  amount: BN;
  // no duplicates
  affected: ClaimAffect[];
};

export interface ClaimAffect {
  trackId: TrackId;
  type: ClaimAffectType;
}

export interface AffectTrack extends ClaimAffect {
  type: ClaimAffectType.Track;
}

export interface AffectVote extends ClaimAffect {
  type: ClaimAffectType.Vote;
  referendumId: ReferendumId;
}

export const enum ClaimAffectType {
  Track = 'track',
  Vote = 'vote',
}

export interface ClaimTime {
  type: ClaimTimeType;
}

export interface ClaimTimeAt extends ClaimTime {
  block: BlockHeight;
  type: ClaimTimeType.At;
}

export interface ClaimTimeUntil extends ClaimTime {
  type: ClaimTimeType.Until;
}

export const enum ClaimTimeType {
  At = 'at',
  Until = 'until',
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

// UnlockChunk
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
