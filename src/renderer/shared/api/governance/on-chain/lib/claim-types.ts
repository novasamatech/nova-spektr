import { type BN } from '@polkadot/util';

import { type Address, type BlockHeight, type ReferendumId, type TrackId } from '@/shared/core';

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

export type ClaimAction = Unlock | RemoveVote;

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
