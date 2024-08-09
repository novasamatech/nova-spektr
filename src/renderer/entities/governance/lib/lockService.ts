import { type BN, BN_ZERO, bnMax } from '@polkadot/util';

import { type ClaimTime, type ClaimTimeAt, type ClaimTimeUntil } from '@shared/api/governance';
import { type Conviction, type Voting } from '@shared/core';

import { votingService } from './votingService';

enum LockPeriod {
  None = 0,
  Locked1x = 1,
  Locked2x = 2,
  Locked3x = 4,
  Locked4x = 8,
  Locked5x = 16,
  Locked6x = 32,
}

const getLockPeriods = (conviction: Conviction): number => LockPeriod[conviction];

// Claim time types

const isClaimAt = (claim: ClaimTime): claim is ClaimTimeAt => claim.type === 'at';

const isClaimUntil = (claim: ClaimTime): claim is ClaimTimeUntil => claim.type === 'until';

const getTotalLock = (voting: Voting): BN => {
  if (votingService.isCasting(voting)) {
    const maxVote = Object.values(voting.votes).reduce<BN>((acc, vote) => {
      if (votingService.isStandardVote(vote)) {
        acc = bnMax(vote.balance, acc);
      }
      if (votingService.isSplitVote(vote)) {
        acc = bnMax(vote.aye.add(vote.nay), acc);
      }
      if (votingService.isSplitAbstainVote(vote)) {
        acc = bnMax(vote.aye.add(vote.nay).add(vote.abstain), acc);
      }

      return acc;
    }, BN_ZERO);

    return bnMax(maxVote, voting.prior.amount);
  }

  if (votingService.isDelegating(voting)) {
    return bnMax(voting.balance, voting.prior.amount);
  }

  return BN_ZERO;
};

export const locksService = {
  getLockPeriods,
  getTotalLock,
  isClaimAt,
  isClaimUntil,
};
