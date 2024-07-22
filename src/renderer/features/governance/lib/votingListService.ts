import { type BN } from '@polkadot/util';

import { type AccountVote } from '@shared/core';
import { votingService } from '@entities/governance';
import { type DecoupledVote } from '../types/structs';

const multiplyBalanceByConviction = (balance: BN, conviction: number) => {
  if (conviction < 1) {
    return balance.muln(conviction * 10).divn(10);
  }

  return balance.muln(conviction);
};

const getDecoupledVotesFromVote = (vote: AccountVote) => {
  const res: DecoupledVote[] = [];

  if (votingService.isStandardVote(vote)) {
    res.push({
      decision: vote.vote.type,
      voter: vote.address,
      balance: vote.balance,
      conviction: votingService.getVotingPower(vote.vote.conviction),
      votingPower: multiplyBalanceByConviction(vote.balance, votingService.getVotingPower(vote.vote.conviction)),
    });
  }

  if (votingService.isSplitVote(vote)) {
    const conviction = votingService.getVotingPower('None');
    if (!vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: vote.address,
        balance: vote.aye,
        conviction,
        votingPower: multiplyBalanceByConviction(vote.aye, conviction),
      });
    }
    if (!vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: vote.address,
        balance: vote.nay,
        conviction,
        votingPower: multiplyBalanceByConviction(vote.nay, conviction),
      });
    }
  }

  if (votingService.isSplitAbstainVote(vote)) {
    const conviction = votingService.getVotingPower('None');
    if (!vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: vote.address,
        balance: vote.aye,
        conviction,
        votingPower: multiplyBalanceByConviction(vote.aye, conviction),
      });
    }
    if (!vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: vote.address,
        balance: vote.nay,
        conviction,
        votingPower: multiplyBalanceByConviction(vote.nay, conviction),
      });
    }
    if (!vote.abstain.isZero()) {
      res.push({
        decision: 'abstain',
        voter: vote.address,
        balance: vote.abstain,
        conviction,
        votingPower: multiplyBalanceByConviction(vote.abstain, conviction),
      });
    }
  }

  return res;
};

export const votingListService = {
  getDecoupledVotesFromVote,
};
