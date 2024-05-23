import { BN_ZERO, BN } from '@polkadot/util';

import {
  Voting,
  CastingVoting,
  DelegatingVoting,
  VotingType,
  VoteType,
  StandardVote,
  SplitVote,
  SplitAbstainVote,
  ReferendumInfo,
  OngoingReferendum,
  ReferendumType,
  RejectedReferendum,
  ApprovedReferendum,
  AccountVote,
  CancelledReferendum,
  TimedOutReferendum,
  KilledReferendum,
  Conviction,
} from '@shared/core';
import { ClaimTime, ClaimTimeAt, ClaimTimeType, ClaimTimeUntil } from './types';

export const onChainUtils = {
  isCasting,
  isDelegating,
  getTotalLock,
  getLockPeriods,

  isStandardVote,

  isClaimAt,
  isClaimUntil,

  isOngoing,
  isRejected,
  isApproved,
  isCancelled,
  isTimedOut,
  isKilled,

  test,
};

const enum Vote {
  Nay = 'nay',
  Aye = 'aye',
}

function getLockPeriods(conviction: Conviction): number {
  return {
    [Conviction.None]: 0,
    [Conviction.Locked1x]: 1,
    [Conviction.Locked2x]: 2,
    [Conviction.Locked3x]: 4,
    [Conviction.Locked4x]: 8,
    [Conviction.Locked5x]: 16,
    [Conviction.Locked6x]: 32,
  }[conviction];
}

// Convert aye nay to on-chain values
function test(vote: Vote, conviction: number): number | undefined {
  const VotesMap: Record<Vote, Record<string, number>> = {
    [Vote.Nay]: { '0.1': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6 },
    [Vote.Aye]: { '0.1': 128, '1': 129, '2': 130, '3': 131, '4': 132, '5': 133, '6': 134 },
  };

  return VotesMap[vote][conviction.toString()];
}

// Voting types

function isCasting(voting: Voting): voting is CastingVoting {
  return voting.type === VotingType.CASTING;
}

function isDelegating(voting: Voting): voting is DelegatingVoting {
  return voting.type === VotingType.DELEGATING;
}

// Vote types

function isStandardVote(vote: AccountVote): vote is StandardVote {
  return vote.type === VoteType.Standard;
}

// Claim time types

function isClaimAt(claim: ClaimTime): claim is ClaimTimeAt {
  return claim.type === ClaimTimeType.At;
}

function isClaimUntil(claim: ClaimTime): claim is ClaimTimeUntil {
  return claim.type === ClaimTimeType.Until;
}

// Referendum statuses

function isOngoing(referendum: ReferendumInfo): referendum is OngoingReferendum {
  return referendum.type === ReferendumType.Ongoing;
}

function isRejected(referendum: ReferendumInfo): referendum is RejectedReferendum {
  return referendum.type === ReferendumType.Rejected;
}

function isApproved(referendum: ReferendumInfo): referendum is ApprovedReferendum {
  return referendum.type === ReferendumType.Approved;
}

function isCancelled(referendum: ReferendumInfo): referendum is CancelledReferendum {
  return referendum.type === ReferendumType.Cancelled;
}

function isTimedOut(referendum: ReferendumInfo): referendum is TimedOutReferendum {
  return referendum.type === ReferendumType.TimedOut;
}

function isKilled(referendum: ReferendumInfo): referendum is KilledReferendum {
  return referendum.type === ReferendumType.Killed;
}

function getTotalLock(voting: Voting): BN {
  if (isCasting(voting)) {
    const maxVote = Object.values(voting.casting.votes).reduce<BN>((acc, vote) => {
      if (vote.type === VoteType.Standard) {
        acc = BN.max((vote as StandardVote).balance, acc);
      }
      if (vote.type === VoteType.Split) {
        const splitVote = vote as SplitVote;
        acc = BN.max(splitVote.aye.add(splitVote.nay), acc);
      }
      if (vote.type === VoteType.SplitAbstain) {
        const abstainVote = vote as SplitAbstainVote;
        acc = BN.max(abstainVote.aye.add(abstainVote.nay).add(abstainVote.abstain), acc);
      }

      return acc;
    }, BN_ZERO);

    return BN.max(maxVote, voting.casting.prior.amount);
  }
  if (isDelegating(voting)) {
    return BN.max(voting.delegating.amount, voting.delegating.prior.amount);
  }

  return BN_ZERO;
}
