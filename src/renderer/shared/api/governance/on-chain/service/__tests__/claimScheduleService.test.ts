import { BN, BN_ZERO, BN_ONE, BN_TWO, BN_TEN, BN_NINE, BN_FIVE, BN_THREE, BN_FOUR, BN_EIGHT } from '@polkadot/util';

import { claimScheduleService } from '../claimScheduleService';
import { RemoveVote, Unlock, ClaimTimeType, ClaimTimeAt, ClaimTimeUntil } from '../../lib/types';
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
  DelegatingVoting,
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
              balance: BN_ONE,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_ONE,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
        ],
      },
    ]);
  });

  test('should handle both passed and not priors', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_TWO, unlockAt: 1000 },
          votes: {},
        },
      },
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ONE, unlockAt: 1100 },
          votes: {},
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_ONE,
        actions: [{ type: 'unlock', trackId: '0' } as Unlock],
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { block: 1100, type: ClaimTimeType.At },
      },
    ]);
  });

  test('should extend votes by prior', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ONE, unlockAt: 1100 },
          votes: {
            0: {
              type: 'standard',
              track: '0',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'pending',
        amount: BN_TWO,
        claimableAt: { block: 1100, type: ClaimTimeType.At },
      },
    ]);
  });

  test('should take max between two locks with same time', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      0: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
      1: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
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
              balance: BN_EIGHT,
            } as StandardVote,
            1: {
              type: 'standard',
              track: '0',
              referendumIndex: '1',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: new BN(8),
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' } as RemoveVote,
          { type: 'remove_vote', trackId: '0', referendumId: '1' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
        ],
      },
    ]);
  });

  test('should handle rejigged prior', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      1: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
    };
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ONE, unlockAt: 1100 },
          votes: {
            1: {
              type: 'standard',
              track: '0',
              referendumIndex: '1',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1200,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_TWO,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '1' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
        ],
      },
    ]);
  });

  test('should fold several claimable to one', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      0: { type: ReferendumType.Approved, since: 1100 } as ApprovedReferendum,
      1: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
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
              balance: BN_ONE,
            } as StandardVote,
          },
        },
      },
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            1: {
              type: 'standard',
              track: '1',
              referendumIndex: '1',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: { 0: BN_ZERO, 1: BN_ZERO },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1100,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_TWO,
        actions: [
          { type: 'remove_vote', trackId: '1', referendumId: '1' } as RemoveVote,
          { type: 'unlock', trackId: '1' } as Unlock,

          { type: 'remove_vote', trackId: '0', referendumId: '0' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
        ],
      },
    ]);
  });

  test('should include shadowed actions', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      1: { type: ReferendumType.Approved, since: 1000 } as ApprovedReferendum,
      2: { type: ReferendumType.Approved, since: 1100 } as ApprovedReferendum,
      3: { type: ReferendumType.Approved, since: 1200 } as ApprovedReferendum,
    };
    const votingByTrack: Record<TrackId, CastingVoting> = {
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            1: {
              type: 'standard',
              track: '1',
              referendumIndex: '1',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_ONE,
            } as StandardVote,
          },
        },
      },
      2: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            2: {
              type: 'standard',
              track: '2',
              referendumIndex: '2',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
      3: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            3: {
              type: 'standard',
              track: '3',
              referendumIndex: '3',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_ONE,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: { 1: BN_ZERO, 2: BN_ZERO, 3: BN_ZERO },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1200,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_TWO,
        actions: [
          { type: 'remove_vote', trackId: '2', referendumId: '2' } as RemoveVote,
          { type: 'unlock', trackId: '2' } as Unlock,

          { type: 'remove_vote', trackId: '1', referendumId: '1' } as RemoveVote,
          { type: 'unlock', trackId: '1' } as Unlock,

          { type: 'remove_vote', trackId: '3', referendumId: '3' } as RemoveVote,
          { type: 'unlock', trackId: '3' } as Unlock,
        ],
      },
    ]);
  });

  test('should take gap into account', () => {
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
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_TEN,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
        ],
      },
    ]);
  });

  test('gap should be limited with other locks', () => {
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
              balance: BN_ONE,
            } as StandardVote,
          },
        },
      },
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_TEN, unlockAt: 1000 },
          votes: {},
        },
      },
      2: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ONE, unlockAt: 1100 },
          votes: {},
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_NINE,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' } as RemoveVote,
          { type: 'unlock', trackId: '0' } as Unlock,
          { type: 'unlock', trackId: '1' } as Unlock,
        ],
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.At, block: 1100 } as ClaimTimeAt,
      },
    ]);
  });

  test('gap claim should be delayed', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_TEN, unlockAt: 1100 },
          votes: {},
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'pending',
        amount: BN_TEN,
        claimableAt: { type: ClaimTimeType.At, block: 1100 } as ClaimTimeAt,
      },
    ]);
  });

  test('should not duplicate unlock command with both prior and gap present', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_FIVE, unlockAt: 1050 },
          votes: {},
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1100,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_TEN,
        actions: [{ type: 'unlock', trackId: '0' } as Unlock],
      },
    ]);
  });

  test('pending should be sorted by remaining time', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      0: { type: ReferendumType.Approved, since: 1100 } as ApprovedReferendum,
      1: { type: ReferendumType.Approved, since: 1300 } as ApprovedReferendum,
      2: { type: ReferendumType.Approved, since: 1200 } as ApprovedReferendum,
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
              balance: BN_THREE,
            } as StandardVote,
            1: {
              type: 'standard',
              track: '1',
              referendumIndex: '0',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_ONE,
            } as StandardVote,
            2: {
              type: 'standard',
              track: '2',
              referendumIndex: '0',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TWO,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.At, block: 1100 } as ClaimTimeAt,
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.At, block: 1200 } as ClaimTimeAt,
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.At, block: 1300 } as ClaimTimeAt,
      },
    ]);
  });

  test('gap should not be covered by its track locks', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      5: { type: ReferendumType.Approved, since: 1500 } as ApprovedReferendum,
      13: { type: ReferendumType.Approved, since: 2000 } as ApprovedReferendum,
    };
    const votingByTrack: Record<TrackId, CastingVoting> = {
      20: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            13: {
              type: 'standard',
              track: '20',
              referendumIndex: '13',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_ONE,
            } as StandardVote,
          },
        },
      },
      21: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          votes: {
            5: {
              type: 'standard',
              track: '21',
              referendumIndex: '5',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_TEN,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: { 20: BN_ONE, 21: new BN(101) },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: new BN(91),
        actions: [{ type: 'unlock', trackId: '21' } as Unlock],
      },
      {
        type: 'pending',
        amount: BN_NINE,
        claimableAt: { type: ClaimTimeType.At, block: 1500 } as ClaimTimeAt,
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.At, block: 2000 } as ClaimTimeAt,
      },
    ]);
  });

  test('should handle standalone delegation', () => {
    const votingByTrack: Record<TrackId, DelegatingVoting> = {
      0: {
        type: VotingType.DELEGATING,
        delegating: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          balance: BN_ONE,
          target: '123',
          conviction: Conviction.None,
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 0,
    });

    expect(result).toEqual([
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.Until } as ClaimTimeUntil,
      },
    ]);
  });

  test('should take delegation prior lock into account', () => {
    const votingByTrack: Record<TrackId, DelegatingVoting> = {
      0: {
        type: VotingType.DELEGATING,
        delegating: {
          prior: { amount: BN_TEN, unlockAt: 1100 },
          balance: BN_ONE,
          target: '123',
          conviction: Conviction.None,
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'pending',
        amount: BN_NINE,
        claimableAt: { type: ClaimTimeType.At, block: 1100 } as ClaimTimeAt,
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.Until } as ClaimTimeUntil,
      },
    ]);
  });

  test('delegation plus gap case', () => {
    const votingByTrack: Record<TrackId, DelegatingVoting> = {
      0: {
        type: VotingType.DELEGATING,
        delegating: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          balance: BN_ONE,
          target: '123',
          conviction: Conviction.None,
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: {},
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: 'claimable',
        amount: BN_NINE,
        actions: [{ type: 'unlock', trackId: '0' } as Unlock],
      },
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.Until } as ClaimTimeUntil,
      },
    ]);
  });

  test('delegate plus voting case', () => {
    const referendums: Record<ReferendumId, ApprovedReferendum> = {
      0: { type: ReferendumType.Approved, since: 1100 },
    };
    const votingByTrack: Record<TrackId, DelegatingVoting | CastingVoting> = {
      0: {
        type: VotingType.DELEGATING,
        delegating: {
          prior: { amount: BN_ZERO, unlockAt: 0 },
          balance: BN_ONE,
          target: '123',
          conviction: Conviction.None,
        },
      },
      1: {
        type: VotingType.CASTING,
        casting: {
          prior: { amount: BN_TEN, unlockAt: 1000 },
          votes: {
            0: {
              type: 'standard',
              track: '1',
              referendumIndex: '0',
              vote: { type: 'aye', conviction: Conviction.None },
              balance: BN_FIVE,
            } as StandardVote,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums,
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      // 5 is claimable from track 1 priors
      {
        type: 'claimable',
        amount: BN_FIVE,
        actions: [{ type: 'unlock', trackId: '1' } as Unlock],
      },
      // 4 is delayed until 1100 from track 1 votes
      {
        type: 'pending',
        amount: BN_FOUR,
        claimableAt: { type: ClaimTimeType.At, block: 1100 } as ClaimTimeAt,
      },
      // 1 is delayed indefinitely because of track 1 delegation
      {
        type: 'pending',
        amount: BN_ONE,
        claimableAt: { type: ClaimTimeType.Until } as ClaimTimeUntil,
      },
    ]);
  });
});
