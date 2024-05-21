import { BN } from '@polkadot/util';

import type { BlockHeight, ReferendumId, TrackId } from '@shared/core';

export type ClaimableLock = {
  claimAt: BlockHeight;
  amount: BN;
  affected: ClaimAffect[];
  // affected: Set<ClaimAffect>;
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

export type ClaimVoteType = 'aye' | 'nay';
