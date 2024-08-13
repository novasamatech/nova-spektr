import { type ReferendumId, type Voting } from '@shared/core';
import { votingService } from '@entities/governance';
import { type DecoupledVote } from '../types/structs';

const getDecoupledVotesFromVote = (referendumId: ReferendumId, voting: Voting) => {
  const res: DecoupledVote[] = [];

  if (votingService.isDelegating(voting)) {
    res.push({
      decision: 'abstain',
      voter: voting.target,
      votingPower: votingService.calculateVotingPower(voting.balance, voting.conviction),
      conviction: votingService.getConvictionMultiplier(voting.conviction),
      balance: voting.balance,
    });

    return res;
  }

  for (const [referendum, vote] of Object.entries(voting.votes)) {
    if (referendum !== referendumId) {
      continue;
    }

    const conviction = votingService.getAccountVoteConviction(vote);
    const convictionMultiplier = votingService.getConvictionMultiplier(conviction);

    if (votingService.isStandardVote(vote)) {
      res.push({
        decision: vote.vote.aye ? 'aye' : 'nay',
        voter: voting.address,
        balance: vote.balance,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateAccountVotePower(vote),
      });
    }

    if (votingService.isSplitVote(vote)) {
      if (!vote.aye.isZero()) {
        res.push({
          decision: 'aye',
          voter: voting.address,
          balance: vote.aye,
          conviction: convictionMultiplier,
          votingPower: votingService.calculateAccountVotePower(vote),
        });
      }
      if (!vote.nay.isZero()) {
        res.push({
          decision: 'nay',
          voter: voting.address,
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
          voter: voting.address,
          balance: vote.aye,
          conviction: votingService.getConvictionMultiplier(conviction),
          votingPower: votingService.calculateAccountVotePower(vote),
        });
      }
      if (!vote.nay.isZero()) {
        res.push({
          decision: 'nay',
          voter: voting.address,
          balance: vote.nay,
          conviction: votingService.getConvictionMultiplier(conviction),
          votingPower: votingService.calculateVotingPower(vote.nay, conviction),
        });
      }
      if (!vote.abstain.isZero()) {
        res.push({
          decision: 'abstain',
          voter: voting.address,
          balance: vote.abstain,
          conviction: votingService.getConvictionMultiplier(conviction),
          votingPower: votingService.calculateVotingPower(vote.abstain, conviction),
        });
      }
    }
  }

  return res;
};

export const votingListService = {
  getDecoupledVotesFromVote,
};
