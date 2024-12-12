import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO, bnMax } from '@polkadot/util';

import { type ClaimTime, type ClaimTimeAt, type ClaimTimeUntil } from '@/shared/api/governance';
import { type Balance, type Conviction, type Voting } from '@/shared/core';
import { getRelativeTimeFromApi, totalAmountBN } from '@/shared/lib/utils';

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

const getLockPeriodsMultiplier = (conviction: Conviction): number => LockPeriod[conviction];

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

const getLockPeriods = async (api: ApiPromise) => {
  const voteLockingPeriod = await api.consts.convictionVoting.voteLockingPeriod.toNumber();
  const convictionList = votingService.getConvictionList();
  const requests = convictionList.map(
    async (conviction) =>
      [
        conviction,
        await getRelativeTimeFromApi(voteLockingPeriod * locksService.getLockPeriodsMultiplier(conviction), api),
      ] as const,
  );
  const responses = await Promise.all(requests);

  return responses.reduce(
    (acc, [conviction, lockPeriod]) => {
      acc[conviction] = lockPeriod;

      return acc;
    },
    {} as Record<Conviction, number>,
  );
};

const getAvailableBalance = (balance: Balance) => {
  return totalAmountBN(balance);
};

export const locksService = {
  getLockPeriodsMultiplier,
  getLockPeriods,
  getTotalLock,
  getAvailableBalance,
  isClaimAt,
  isClaimUntil,
};
