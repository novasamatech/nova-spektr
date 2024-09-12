import { type ReferendumId, type Voting } from '@shared/core';
import { votingService } from '@entities/governance';
import { type VoteHistoryRecord } from '@entities/governance/model/voteHistory';
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
      res.push({
        decision: 'aye',
        voter: voting.address,
        balance: vote.aye,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateVotingPower(vote.aye, conviction),
      });
      res.push({
        decision: 'nay',
        voter: voting.address,
        balance: vote.nay,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateVotingPower(vote.nay, conviction),
      });
    }

    if (votingService.isSplitAbstainVote(vote)) {
      if (!vote.aye.isZero()) {
        res.push({
          decision: 'aye',
          voter: voting.address,
          balance: vote.aye,
          conviction: convictionMultiplier,
          votingPower: votingService.calculateVotingPower(vote.aye, conviction),
        });
      }
      if (!vote.nay.isZero()) {
        res.push({
          decision: 'nay',
          voter: voting.address,
          balance: vote.nay,
          conviction: convictionMultiplier,
          votingPower: votingService.calculateVotingPower(vote.nay, conviction),
        });
      }
      if (!vote.abstain.isZero()) {
        res.push({
          decision: 'abstain',
          voter: voting.address,
          balance: vote.abstain,
          conviction: convictionMultiplier,
          votingPower: votingService.calculateVotingPower(vote.abstain, conviction),
        });
      }
    }
  }

  return res;
};

const getDecoupledVotesFromVotingHistory = (voting: VoteHistoryRecord) => {
  const res: DecoupledVote[] = [];

  if (votingService.isStandardVote(voting.vote)) {
    res.push({
      decision: voting.vote.vote.aye ? 'aye' : 'nay',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(voting.vote.balance, voting.vote.vote.conviction),
      conviction: votingService.getConvictionMultiplier(voting.vote.vote.conviction),
      balance: voting.vote.balance,
    });

    for (const delegatedVote of voting.delegatorVotes) {
      res.push({
        decision: voting.vote.vote.aye ? 'aye' : 'nay',
        voter: delegatedVote.delegator,
        votingPower: votingService.calculateVotingPower(delegatedVote.amount, delegatedVote.conviction),
        conviction: votingService.getConvictionMultiplier(delegatedVote.conviction),
        balance: delegatedVote.amount,
      });
    }
  }

  if (votingService.isSplitVote(voting.vote)) {
    const conviction = votingService.getAccountVoteConviction(voting.vote);
    res.push({
      decision: 'aye',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(voting.vote.aye, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: voting.vote.aye,
    });

    res.push({
      decision: 'aye',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(voting.vote.nay, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: voting.vote.nay,
    });
  }

  if (votingService.isSplitAbstainVote(voting.vote)) {
    const conviction = votingService.getAccountVoteConviction(voting.vote);

    if (!voting.vote.aye.isZero()) {
      res.push({
        decision: 'aye',
        voter: voting.voter,
        votingPower: votingService.calculateVotingPower(voting.vote.aye, conviction),
        conviction: votingService.getConvictionMultiplier(conviction),
        balance: voting.vote.aye,
      });
    }

    if (!voting.vote.nay.isZero()) {
      res.push({
        decision: 'nay',
        voter: voting.voter,
        votingPower: votingService.calculateVotingPower(voting.vote.nay, conviction),
        conviction: votingService.getConvictionMultiplier(conviction),
        balance: voting.vote.nay,
      });
    }

    res.push({
      decision: 'abstain',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(voting.vote.abstain, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: voting.vote.abstain,
    });
  }

  return res;
};

export const votingListService = {
  getDecoupledVotesFromVote,
  getDecoupledVotesFromVotingHistory,
};
