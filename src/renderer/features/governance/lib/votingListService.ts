import { BN } from '@polkadot/util';

import { type SubQueryVoting } from '@shared/api/governance';
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

const getDecoupledVotesFromSubQueryVote = (referendumId: ReferendumId, voting: SubQueryVoting) => {
  const res: DecoupledVote[] = [];

  if (voting.standardVote) {
    const amount = new BN(voting.standardVote.vote.amount);
    const conviction = voting.standardVote.vote.conviction;

    res.push({
      decision: voting.standardVote.aye ? 'aye' : 'nay',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(amount, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: amount,
    });

    for (const delegatedVote of voting.delegatorVotes.nodes) {
      const amount = new BN(delegatedVote.vote.amount);
      res.push({
        decision: voting.standardVote.aye ? 'aye' : 'nay',
        voter: delegatedVote.delegator,
        votingPower: votingService.calculateVotingPower(amount, delegatedVote.vote.conviction),
        conviction: votingService.getConvictionMultiplier(delegatedVote.vote.conviction),
        balance: amount,
      });
    }
  }

  if (voting.splitVote) {
    const conviction = 'Locked1x';

    const ayeAmount = new BN(voting.splitVote.ayeAmount);
    res.push({
      decision: 'aye',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(ayeAmount, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: ayeAmount,
    });

    const nayAmount = new BN(voting.splitVote.nayAmount);
    res.push({
      decision: 'nay',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(nayAmount, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: nayAmount,
    });
  }

  if (voting.splitAbstainVote) {
    const conviction = 'None';

    const ayeAmount = new BN(voting.splitAbstainVote.ayeAmount);
    if (!ayeAmount.isZero()) {
      res.push({
        decision: 'aye',
        voter: voting.voter,
        votingPower: votingService.calculateVotingPower(ayeAmount, conviction),
        conviction: votingService.getConvictionMultiplier(conviction),
        balance: ayeAmount,
      });
    }

    const nayAmount = new BN(voting.splitAbstainVote.nayAmount);
    if (!nayAmount.isZero()) {
      res.push({
        decision: 'nay',
        voter: voting.voter,
        votingPower: votingService.calculateVotingPower(nayAmount, conviction),
        conviction: votingService.getConvictionMultiplier(conviction),
        balance: nayAmount,
      });
    }

    const abstainAmount = new BN(voting.splitAbstainVote.abstainAmount);
    res.push({
      decision: 'abstain',
      voter: voting.voter,
      votingPower: votingService.calculateVotingPower(abstainAmount, conviction),
      conviction: votingService.getConvictionMultiplier(conviction),
      balance: abstainAmount,
    });
  }

  return res;
};

export const votingListService = {
  getDecoupledVotesFromVote,
  getDecoupledVotesFromSubQueryVote,
};
