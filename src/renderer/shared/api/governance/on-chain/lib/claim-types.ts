import { type BN } from '@polkadot/util';

import { type BlockHeight, type ReferendumId, type TrackId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export type ClaimableLock = {
  claimAt: ClaimTime;
  amount: BN;
  // contains no duplicates
  affected: ClaimAffect[];
};

export interface AffectTrack {
  type: 'track';
  trackId: TrackId;
}

export interface AffectVote {
  type: 'vote';
  trackId: TrackId;
  referendumId: ReferendumId;
}

export type ClaimAffect = AffectTrack | AffectVote;

export type ClaimTime = ClaimTimeAt | ClaimTimeUntil;

export interface ClaimTimeAt {
  type: 'at';
  block: BlockHeight;
}

export interface ClaimTimeUntil {
  type: 'until';
}

export type GroupedClaimAffects = {
  trackId: TrackId;
  hasPriorAffect: boolean;
  votes: AffectVote[];
};

// Claim action

export type Unlock = {
  type: 'unlock';
  trackId: TrackId;
};

export type RemoveVote = {
  type: 'remove_vote';
  trackId: TrackId;
  referendumId: ReferendumId;
};

/**
 * Revokes the account's delegation on one track — origin-bound like
 * `remove_vote`.
 */
export type Undelegate = {
  type: 'undelegate';
  trackId: TrackId;
};

export type ClaimAction = Unlock | RemoveVote | Undelegate;

// Unlock chunk
export enum UnlockChunkType {
  CLAIMABLE = 'claimable',
  PENDING_DELEGATION = 'pendingDelagation',
  PENDING_LOCK = 'pendingLock',
}

export interface ClaimableChunk {
  type: UnlockChunkType.CLAIMABLE;
  amount: BN;
  actions: ClaimAction[];
}

export interface PendingChunk {
  type: UnlockChunkType.PENDING_DELEGATION | UnlockChunkType.PENDING_LOCK;
  amount: BN;
  claimableAt: ClaimTime;
  affected: ClaimAffect[];
}

export interface PendingChunkWithAccountId extends PendingChunk {
  accountId: AccountId;
  timeToBlock?: number;
}

export interface ClaimChunkWithAccountId extends ClaimableChunk {
  accountId: AccountId;
}

export type Chunks = ClaimableChunk | PendingChunk;

export type UnlockChunk = ClaimChunkWithAccountId | PendingChunkWithAccountId;
