import { type BN } from '@polkadot/util';

import { type Address, type BlockHeight, type ReferendumId, type TrackId } from '@shared/core';

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

export type ClaimTime = ClaimTimeAt | ClaimTimeUntil;

export interface ClaimTimeAt {
  block: BlockHeight;
  type: 'at';
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
export enum UnlockChunkType {
  CLAIMABLE = 'claimable',
  PENDING_DELIGATION = 'pendingDelagation',
  PENDING_LOCK = 'pendingLock',
}

export interface ClaimableChunk {
  type: UnlockChunkType.CLAIMABLE;
  amount: BN;
  actions: ClaimAction[];
}

export interface PendingChunk {
  type: UnlockChunkType.PENDING_DELIGATION | UnlockChunkType.PENDING_LOCK;
  amount: BN;
  claimableAt: ClaimTime;
}

export interface PendingChunkWithAddress extends PendingChunk {
  address: Address;
  timeToBlock?: number;
}

export interface ClaimChunkWithAddress extends ClaimableChunk {
  address: Address;
}

export type Chunks = ClaimableChunk | PendingChunk;

export type UnlockChunk = ClaimChunkWithAddress | PendingChunkWithAddress;
