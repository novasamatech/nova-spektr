import { type AccountVote } from '@shared/core';
import { votingService } from '@entities/governance';
import { type DecoupledVote } from '../types/structs';

const getDecoupledVotesFromVote = (vote: AccountVote) => {
  const res: DecoupledVote[] = [];

  if (votingService.isStandardVote(vote)) {
    res.push({
      decision: vote.vote.type,
      voter: vote.address,
      balance: vote.balance,
      conviction: votingService.getVotingPower(vote.vote.conviction),
      votingPower: votingService.calculateVotingPower(vote.balance, vote.vote.conviction),
    });
  }

  if (votingService.isSplitVote(vote)) {
    const conviction = 'None';
    if (!vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: vote.address,
        balance: vote.aye,
        conviction: votingService.getVotingPower(conviction),
        votingPower: votingService.calculateVotingPower(vote.aye, conviction),
      });
    }
    if (!vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: vote.address,
        balance: vote.nay,
        conviction: votingService.getVotingPower(conviction),
        votingPower: votingService.calculateVotingPower(vote.nay, conviction),
      });
    }
  }

  if (votingService.isSplitAbstainVote(vote)) {
    const conviction = 'None';
    if (!vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: vote.address,
        balance: vote.aye,
        conviction: votingService.getVotingPower(conviction),
        votingPower: votingService.calculateVotingPower(vote.aye, conviction),
      });
    }
    if (!vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: vote.address,
        balance: vote.nay,
        conviction: votingService.getVotingPower(conviction),
        votingPower: votingService.calculateVotingPower(vote.nay, conviction),
      });
    }
    if (!vote.abstain.isZero()) {
      res.push({
        decision: 'abstain',
        voter: vote.address,
        balance: vote.abstain,
        conviction: votingService.getVotingPower(conviction),
        votingPower: votingService.calculateVotingPower(vote.abstain, conviction),
      });
    }
  }

  return res;
};

export const votingListService = {
  getDecoupledVotesFromVote,
};
