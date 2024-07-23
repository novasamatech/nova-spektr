import { type AccountVote } from '@shared/core';
import { votingService } from '@entities/governance';
import { type DecoupledVote } from '../types/structs';

const getDecoupledVotesFromVote = (vote: AccountVote) => {
  const res: DecoupledVote[] = [];
  const conviction = votingService.getAccountVoteConviction(vote);
  const convictionMultiplier = votingService.getConvictionMultiplier(conviction);

  if (votingService.isStandardVote(vote)) {
    res.push({
      decision: vote.vote.type,
      voter: vote.address,
      balance: vote.balance,
      conviction: convictionMultiplier,
      votingPower: votingService.calculateAccountVotePower(vote),
    });
  }

  if (votingService.isSplitVote(vote)) {
    if (!vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: vote.address,
        balance: vote.aye,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateAccountVotePower(vote),
      });
    }
    if (!vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: vote.address,
        balance: vote.nay,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateAccountVotePower(vote),
      });
    }
  }

  if (votingService.isSplitAbstainVote(vote)) {
    if (!vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: vote.address,
        balance: vote.aye,
        conviction: votingService.getConvictionMultiplier(conviction),
        votingPower: votingService.calculateAccountVotePower(vote),
      });
    }
    if (!vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: vote.address,
        balance: vote.nay,
        conviction: votingService.getConvictionMultiplier(conviction),
        votingPower: votingService.calculateVotingPower(vote.nay, conviction),
      });
    }
    if (!vote.abstain.isZero()) {
      res.push({
        decision: 'abstain',
        voter: vote.address,
        balance: vote.abstain,
        conviction: votingService.getConvictionMultiplier(conviction),
        votingPower: votingService.calculateVotingPower(vote.abstain, conviction),
      });
    }
  }

  return res;
};

export const votingListService = {
  getDecoupledVotesFromVote,
};
