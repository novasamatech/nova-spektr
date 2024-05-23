import { BN } from '@polkadot/util';

import { claimScheduleService } from '../claimScheduleService';
import { ReferendumId, TrackId, TrackInfo, Voting, ReferendumType, OngoingReferendum } from '@shared/core';

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
    // currentBlock(1000)
    //
    // track(0) {
    //   voting {
    //     vote(amount = 1, referendumId = 0, unlockAt = 1000)
    //   }
    // }

    const referendums: Record<ReferendumId, OngoingReferendum> = {
      1: {
        type: ReferendumType.Ongoing,
      } as OngoingReferendum,
    };
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
      currentBlockNumber: 1000,
    });

    expect(result).toEqual(1);
  });
});
