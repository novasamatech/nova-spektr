import { type BN, BN_ZERO, bnMax } from '@polkadot/util';

import {
  type AccountVote,
  type ApprovedReferendum,
  type CastingVoting,
  type Conviction,
  type DelegatingVoting,
  type OngoingReferendum,
  type ReferendumInfo,
  ReferendumType,
  type RejectedReferendum,
  type SplitAbstainVote,
  type SplitVote,
  type StandardVote,
  type Voting,
} from '@shared/core';

import { type ClaimTime, type ClaimTimeAt } from './claim-types';

export const onChainUtils = {
  isCasting,
  isDelegating,
  getTotalLock,
  getLockPeriods,

  isStandardVote,
  isClaimAt,

  isOngoing,
  isRejected,
  isApproved,

  test,
};

const enum Vote {
  Nay = 'nay',
  Aye = 'aye',
}

function getLockPeriods(conviction: Conviction): number {
  return {
    None: 0,
    Locked1x: 1,
    Locked2x: 2,
    Locked3x: 4,
    Locked4x: 8,
    Locked5x: 16,
    Locked6x: 32,
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
  return voting.type === 'casting';
}

function isDelegating(voting: Voting): voting is DelegatingVoting {
  return voting.type === 'delegating';
}

// Voted types

function isStandardVote(vote: AccountVote): vote is StandardVote {
  return vote.type === 'standard';
}

// Claim time types

function isClaimAt(claim: ClaimTime): claim is ClaimTimeAt {
  return claim.type === 'at';
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

function getTotalLock(voting: Voting): BN {
  if (isCasting(voting)) {
    const maxVote = Object.values(voting.casting.votes).reduce<BN>((acc, vote) => {
      if (vote.type === 'standard') {
        acc = bnMax((vote as StandardVote).balance, acc);
      }
      if (vote.type === 'split') {
        const splitVote = vote as SplitVote;
        acc = bnMax(splitVote.aye.add(splitVote.nay), acc);
      }
      if (vote.type === 'splitAbstain') {
        const abstainVote = vote as SplitAbstainVote;
        acc = bnMax(abstainVote.aye.add(abstainVote.nay).add(abstainVote.abstain), acc);
      }

      return acc;
    }, BN_ZERO);

    return bnMax(maxVote, voting.casting.prior.amount);
  }

  if (isDelegating(voting)) {
    return bnMax(voting.delegating.balance, voting.delegating.prior.amount);
  }

  return BN_ZERO;
}
