import { BN, BN_ZERO } from '@polkadot/util';

import { claimScheduleService } from '../claimScheduleService';
import { RemoveVote, Unlock, ClaimTimeType } from '../../lib/types';
import {
  ReferendumId,
  TrackId,
  TrackInfo,
  Voting,
  ReferendumType,
  OngoingReferendum,
  VotingType,
  CastingVoting,
  StandardVote,
  Conviction,
  ApprovedReferendum,
} from '@shared/core';

describe('shared/api/governance/claimScheduleService', () => {
  test('should handle empty case', () => {
    const referendums: Record<ReferendumId, OngoingReferendum> = {};
    const tracks: Record<TrackId, TrackInfo> = {};
    const trackLocks: Record<TrackId, BN> = {};
    const votingByTrack: Record<TrackId, Voting> = {};

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks,
      trackLocks,
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 0,
    });

    expect(result).toEqual([]);
  });

  test('should handle single claimable', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      0: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
    };
    const tracks: Record<TrackId, TrackInfo> = {
      0: {} as TrackInfo,
    };
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            0: {
              type: 'standard',
              track: '0',
              referendumIndex: '0',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: new BN(1),
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks,
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: new BN(1),
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
        ],
      },
    ]);
  });

  test('should handle both passed and not priors', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      0: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
    };
    const tracks: Record<TrackId, TrackInfo> = {
      0: {} as TrackInfo,
      1: {} as TrackInfo,
    };
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: new BN(2), unlockAt: 1000 },
          votes: {},
        },
      },
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: new BN(1), unlockAt: 1100 },
          votes: {},
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks,
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: new BN(1),
        actions: [{ type: 'unlock', trackId: '0' } as Unlock],
      },
      {
        type: 'pending',
        amount: new BN(1),
        claimableAt: { block: 1100, type: ClaimTimeType.At },
      },
    ]);
  });
});
