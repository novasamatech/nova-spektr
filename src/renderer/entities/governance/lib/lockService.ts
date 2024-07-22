import { type BN, BN_ZERO, bnMax } from '@polkadot/util';

import { type ClaimTime, type ClaimTimeAt, type ClaimTimeUntil } from '@shared/api/governance';
import { type Conviction, type Voting } from '@shared/core';

import { votingService } from './votingService';

const lockPeriod = {
  None: 0,
  Locked1x: 1,
  Locked2x: 2,
  Locked3x: 4,
  Locked4x: 8,
  Locked5x: 16,
  Locked6x: 32,
};

const getLockPeriods = (conviction: Conviction): number => lockPeriod[conviction];

// Claim time types

const isClaimAt = (claim: ClaimTime): claim is ClaimTimeAt => claim.type === 'at';

const isClaimUntil = (claim: ClaimTime): claim is ClaimTimeUntil => claim.type === 'until';

const getTotalLock = (voting: Voting): BN => {
  if (votingService.isCasting(voting)) {
    const maxVote = Object.values(voting.casting.votes).reduce<BN>((acc, vote) => {
      if (vote.type === 'standard') {
        acc = bnMax(vote.balance, acc);
      }
      if (vote.type === 'split') {
        acc = bnMax(vote.aye.add(vote.nay), acc);
      }
      if (vote.type === 'splitAbstain') {
        acc = bnMax(vote.aye.add(vote.nay).add(vote.abstain), acc);
      }

      return acc;
    }, BN_ZERO);

    return bnMax(maxVote, voting.casting.prior.amount);
  }

  if (votingService.isDelegating(voting)) {
    return bnMax(voting.delegating.balance, voting.delegating.prior.amount);
  }

  return BN_ZERO;
};

export const locksService = {
  getLockPeriods,
  getTotalLock,
  isClaimAt,
  isClaimUntil,
};
