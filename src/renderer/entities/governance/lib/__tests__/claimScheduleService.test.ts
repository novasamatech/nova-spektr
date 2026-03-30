import { BN, BN_EIGHT, BN_FIVE, BN_FOUR, BN_NINE, BN_ONE, BN_TEN, BN_THREE, BN_TWO, BN_ZERO } from '@polkadot/util';

import { UnlockChunkType } from '@/shared/api/governance';
import {
  type ApprovedReferendum,
  type CastingVoting,
  type DelegatingVoting,
  type Referendum,
  type TrackId,
  type TrackInfo,
  type Voting,
} from '@/shared/core';
import { TEST_ACCOUNTS } from '@/shared/lib/utils';
import { claimScheduleService } from '../claimScheduleService';

describe('claimScheduleService', () => {
  test('should handle empty case', () => {
    const referendums: Referendum[] = [{ type: 'Approved', referendumId: '123' } as ApprovedReferendum];
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
    const referendums: Referendum[] = [{ type: 'Approved', referendumId: '123' } as ApprovedReferendum];
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          0: {
            type: 'Standard',
            balance: BN_ONE,
            vote: { aye: true, conviction: 'None' },
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
          { type: 'remove_vote', trackId: '0', referendumId: '0' },
          { type: 'unlock', trackId: '0' },
        ],
      },
    ]);
  });

  test('should handle both passed and not priors', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_TWO, unlockAt: 1000 },
        votes: {},
      },
      1: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ONE, unlockAt: 1100 },
        votes: {},
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.CLAIMABLE,
        amount: BN_ONE,
        actions: [{ type: 'unlock', trackId: '0' }],
      },
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_ONE,
        claimableAt: { block: 1100, type: 'at' },
        affected: [{ trackId: '1', type: 'track' }],
      },
    ]);
  });

  test('should extend votes by prior', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ONE, unlockAt: 1100 },
        votes: {
          0: {
            type: 'Standard',
            balance: BN_TWO,
            vote: { aye: true, conviction: 'None' },
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_TWO,
        claimableAt: { block: 1100, type: 'at' },
        affected: [
          { trackId: '0', type: 'track' },
          { trackId: '0', type: 'vote', referendumId: '0' },
        ],
      },
    ]);
  });

  test('should take max between two locks with same time', () => {
    const referendums: Referendum[] = [
      { type: 'Approved', referendumId: '12' } as ApprovedReferendum,
      { type: 'Approved', referendumId: '22' } as ApprovedReferendum,
    ];

    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        votes: {
          0: {
            type: 'Standard',
            balance: BN_EIGHT,
            vote: { aye: true, conviction: 'None' },
          },
          1: {
            type: 'Standard',
            balance: BN_TWO,
            vote: { aye: true, conviction: 'None' },
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
        type: UnlockChunkType.CLAIMABLE,
        amount: new BN(8),
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' },
          { type: 'remove_vote', trackId: '0', referendumId: '1' },
          { type: 'unlock', trackId: '0' },
        ],
      },
    ]);
  });

  test('should handle rejigged prior', () => {
    const referendums: Referendum[] = [{ type: 'Approved', referendumId: '123' } as ApprovedReferendum];

    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ONE, unlockAt: 1100 },
        votes: {
          1: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_TWO,
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
          { type: 'remove_vote', trackId: '0', referendumId: '1' },
          { type: 'unlock', trackId: '0' },
        ],
      },
    ]);
  });

  test('should fold several claimable to one', () => {
    const referendums: ApprovedReferendum[] = [
      { type: 'Approved', referendumId: '0', since: 1100, submissionDeposit: null, decisionDeposit: null },
      { type: 'Approved', referendumId: '1', since: 1000, submissionDeposit: null, decisionDeposit: null },
    ];

    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          0: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_ONE,
          },
        },
      },
      1: {
        type: 'Casting',
        track: '0',
        accountId: TEST_ACCOUNTS[0],
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          1: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_TWO,
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
          { type: 'remove_vote', trackId: '1', referendumId: '1' },
          { type: 'unlock', trackId: '1' },

          { type: 'remove_vote', trackId: '0', referendumId: '0' },
          { type: 'unlock', trackId: '0' },
        ],
      },
    ]);
  });

  test('should include shadowed actions', () => {
    const referendums: ApprovedReferendum[] = [
      { type: 'Approved', referendumId: '1', since: 1000, submissionDeposit: null, decisionDeposit: null },
      { type: 'Approved', referendumId: '2', since: 1100, submissionDeposit: null, decisionDeposit: null },
      { type: 'Approved', referendumId: '3', since: 1200, submissionDeposit: null, decisionDeposit: null },
    ];

    const votingByTrack: Record<TrackId, CastingVoting> = {
      1: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '1',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          1: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_ONE,
          },
        },
      },
      2: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '2',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          2: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_TWO,
          },
        },
      },
      3: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '3',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          3: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_ONE,
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
          { type: 'remove_vote', trackId: '2', referendumId: '2' },
          { type: 'unlock', trackId: '2' },

          { type: 'remove_vote', trackId: '1', referendumId: '1' },
          { type: 'unlock', trackId: '1' },

          { type: 'remove_vote', trackId: '3', referendumId: '3' },
          { type: 'unlock', trackId: '3' },
        ],
      },
    ]);
  });

  test('should take gap into account', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          0: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_TWO,
          },
        },
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
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
          { type: 'remove_vote', trackId: '0', referendumId: '0' },
          { type: 'unlock', trackId: '0' },
        ],
      },
    ]);
  });

  test('gap should be limited with other locks', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          0: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_ONE,
          },
        },
      },
      1: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_TEN, unlockAt: 1000 },
        votes: {},
      },
      2: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ONE, unlockAt: 1100 },
        votes: {},
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.CLAIMABLE,
        amount: BN_NINE,
        actions: [
          { type: 'remove_vote', trackId: '0', referendumId: '0' },
          { type: 'unlock', trackId: '0' },
          { type: 'unlock', trackId: '1' },
        ],
      },
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_ONE,
        claimableAt: { type: 'at', block: 1100 },
        affected: [{ trackId: '2', type: 'track' }],
      },
    ]);
  });

  test('gap claim should be delayed', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      1: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_TEN, unlockAt: 1100 },
        votes: {},
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_TEN,
        claimableAt: { type: 'at', block: 1100 },
        affected: [{ trackId: '1', type: 'track' }],
      },
    ]);
  });

  test('should not duplicate unlock command with both prior and gap present', () => {
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_FIVE, unlockAt: 1050 },
        votes: {},
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
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
        actions: [{ type: 'unlock', trackId: '0' }],
      },
    ]);
  });

  test('pending should be sorted by remaining time', () => {
    const referendums: ApprovedReferendum[] = [
      { type: 'Approved', referendumId: '0', since: 1100, submissionDeposit: null, decisionDeposit: null },
      { type: 'Approved', referendumId: '1', since: 1300, submissionDeposit: null, decisionDeposit: null },
      { type: 'Approved', referendumId: '2', since: 1200, submissionDeposit: null, decisionDeposit: null },
    ];
    const votingByTrack: Record<TrackId, CastingVoting> = {
      0: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          0: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_THREE,
          },
          1: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_ONE,
          },
          2: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_TWO,
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
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_ONE,
        claimableAt: { type: 'at', block: 1100 },
        affected: [{ trackId: '0', type: 'vote', referendumId: '0' }],
      },
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_ONE,
        claimableAt: { type: 'at', block: 1200 },
        affected: [{ trackId: '0', type: 'vote', referendumId: '2' }],
      },
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_ONE,
        claimableAt: { type: 'at', block: 1300 },
        affected: [{ trackId: '0', type: 'vote', referendumId: '1' }],
      },
    ]);
  });

  test('gap should not be covered by its track locks', () => {
    const referendums: ApprovedReferendum[] = [
      { type: 'Approved', referendumId: '5', since: 1500, submissionDeposit: null, decisionDeposit: null },
      { type: 'Approved', referendumId: '13', since: 2000, submissionDeposit: null, decisionDeposit: null },
    ];

    const votingByTrack: Record<TrackId, CastingVoting> = {
      20: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '20',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          13: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_ONE,
          },
        },
      },
      21: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '21',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        votes: {
          5: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_TEN,
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
        type: UnlockChunkType.CLAIMABLE,
        amount: new BN(91),
        actions: [{ type: 'unlock', trackId: '21' }],
      },
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_NINE,
        claimableAt: { type: 'at', block: 1500 },
        affected: [{ trackId: '21', type: 'vote', referendumId: '5' }],
      },
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_ONE,
        claimableAt: { type: 'at', block: 2000 },
        affected: [{ trackId: '20', type: 'vote', referendumId: '13' }],
      },
    ]);
  });

  test('should handle standalone delegation', () => {
    const votingByTrack: Record<TrackId, DelegatingVoting> = {
      0: {
        type: 'Delegating',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        balance: BN_ONE,
        target: TEST_ACCOUNTS[1],
        conviction: 'None',
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 0,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.PENDING_DELEGATION,
        amount: BN_ONE,
        claimableAt: { type: 'until' },
        affected: [],
      },
    ]);
  });

  test('should take delegation prior lock into account', () => {
    const votingByTrack: Record<TrackId, DelegatingVoting> = {
      0: {
        type: 'Delegating',
        track: '0',
        accountId: TEST_ACCOUNTS[0],
        prior: { amount: BN_TEN, unlockAt: 1100 },
        balance: BN_ONE,
        target: TEST_ACCOUNTS[1],
        conviction: 'None',
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: {},
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_NINE,
        claimableAt: { type: 'at', block: 1100 },
        affected: [{ trackId: '0', type: 'track' }],
      },
      {
        type: UnlockChunkType.PENDING_DELEGATION,
        amount: BN_ONE,
        claimableAt: { type: 'until' },
        affected: [],
      },
    ]);
  });

  test('delegation plus gap case', () => {
    const votingByTrack: Record<TrackId, DelegatingVoting> = {
      0: {
        type: 'Delegating',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        balance: BN_ONE,
        target: TEST_ACCOUNTS[1],
        conviction: 'None',
      },
    };

    const result = claimScheduleService.estimateClaimSchedule({
      referendums: [],
      tracks: {},
      trackLocks: { 0: BN_TEN },
      votingByTrack,
      voteLockingPeriod: 0,
      undecidingTimeout: 0,
      currentBlockNumber: 1000,
    });

    expect(result).toEqual([
      {
        type: UnlockChunkType.CLAIMABLE,
        amount: BN_NINE,
        actions: [{ type: 'unlock', trackId: '0' }],
      },
      {
        type: UnlockChunkType.PENDING_DELEGATION,
        amount: BN_ONE,
        claimableAt: { type: 'until' },
        affected: [],
      },
    ]);
  });

  test('delegate plus voting case', () => {
    const referendums: ApprovedReferendum[] = [
      { type: 'Approved', referendumId: '0', since: 1100, submissionDeposit: null, decisionDeposit: null },
    ];
    const votingByTrack: Record<TrackId, DelegatingVoting | CastingVoting> = {
      0: {
        type: 'Delegating',
        accountId: TEST_ACCOUNTS[0],
        track: '0',
        prior: { amount: BN_ZERO, unlockAt: 0 },
        balance: BN_ONE,
        target: TEST_ACCOUNTS[1],
        conviction: 'None',
      },
      1: {
        type: 'Casting',
        accountId: TEST_ACCOUNTS[0],
        track: '1',
        prior: { amount: BN_TEN, unlockAt: 1000 },
        votes: {
          0: {
            type: 'Standard',
            vote: { aye: true, conviction: 'None' },
            balance: BN_FIVE,
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
        type: UnlockChunkType.CLAIMABLE,
        amount: BN_FIVE,
        actions: [{ type: 'unlock', trackId: '1' }],
      },
      // 4 is delayed until 1100 from track 1 votes
      {
        type: UnlockChunkType.PENDING_LOCK,
        amount: BN_FOUR,
        claimableAt: { type: 'at', block: 1100 },
        affected: [{ trackId: '1', type: 'vote', referendumId: '0' }],
      },
      // 1 is delayed indefinitely because of track 1 delegation
      {
        type: UnlockChunkType.PENDING_DELEGATION,
        amount: BN_ONE,
        claimableAt: { type: 'until' },
        affected: [],
      },
    ]);
  });
});
