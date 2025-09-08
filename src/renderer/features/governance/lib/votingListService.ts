import { BN } from '@polkadot/util';

import { type ReferendumId, type Voting } from '@/shared/core';
import { entries, toAccountId } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';
import { type VoteHistoryRecord } from '@/entities/governance';
import { type AggregatedVoteHistory, type DecoupledVote, type DelegatedVote } from '../types/structs';
import { votingPowerSorting } from '../utils/votingPowerSorting';

const getDecoupledVotesFromVote = (referendumId: ReferendumId, voting: Voting) => {
  const res: DecoupledVote[] = [];

  if (votingService.isDelegating(voting)) {
    res.push({
      decision: 'abstain',
      voter: toAccountId(voting.target),
      votingPower: votingService.calculateVotingPower(voting.balance, voting.conviction),
      conviction: votingService.getConvictionMultiplier(voting.conviction),
      balance: voting.balance,
    });

    return res;
  }

  for (const [referendum, vote] of entries(voting.votes)) {
    if (referendum !== referendumId) {
      continue;
    }

    const conviction = votingService.getAccountVoteConviction(vote);
    const convictionMultiplier = votingService.getConvictionMultiplier(conviction);

    if (votingService.isStandardVote(vote)) {
      res.push({
        decision: vote.vote.aye ? 'aye' : 'nay',
        voter: voting.accountId,
        balance: vote.balance,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateAccountVotePower(vote),
      });
    }

    if (votingService.isSplitVote(vote)) {
      res.push({
        decision: 'aye',
        voter: voting.accountId,
        balance: vote.aye,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateVotingPower(vote.aye, conviction),
      });
      res.push({
        decision: 'nay',
        voter: voting.accountId,
        balance: vote.nay,
        conviction: convictionMultiplier,
        votingPower: votingService.calculateVotingPower(vote.nay, conviction),
      });
    }

    if (votingService.isSplitAbstainVote(vote)) {
      if (!vote.aye.isZero()) {
        res.push({
          decision: 'aye',
          voter: voting.accountId,
          balance: vote.aye,
          conviction: convictionMultiplier,
          votingPower: votingService.calculateVotingPower(vote.aye, conviction),
        });
      }
      if (!vote.nay.isZero()) {
        res.push({
          decision: 'nay',
          voter: voting.accountId,
          balance: vote.nay,
          conviction: convictionMultiplier,
          votingPower: votingService.calculateVotingPower(vote.nay, conviction),
        });
      }
      if (!vote.abstain.isZero()) {
        res.push({
          decision: 'abstain',
          voter: voting.accountId,
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
        voter: voting.voter,
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
      decision: 'nay',
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

const getVoteGroupsFromVotingHistory = (votingHistory: VoteHistoryRecord[]) => {
  const groups: AggregatedVoteHistory[] = [];

  for (const voting of votingHistory) {
    if (votingService.isStandardVote(voting.vote)) {
      const decision = voting.vote.vote.aye ? 'aye' : 'nay';
      const conviction = votingService.getConvictionMultiplier(voting.vote.vote.conviction);
      const directVotingPower = votingService.calculateVotingPower(voting.vote.balance, voting.vote.vote.conviction);

      const delegatedVotes: DelegatedVote[] = voting.delegatorVotes
        .map(
          (delegatedVote): DelegatedVote => ({
            decision,
            delegator: delegatedVote.delegator,
            balance: delegatedVote.amount,
            votingPower: votingService.calculateVotingPower(delegatedVote.amount, delegatedVote.conviction),
            conviction: votingService.getConvictionMultiplier(delegatedVote.conviction),
          }),
        )
        .sort(votingPowerSorting);

      const delegatedVotingPower = delegatedVotes.reduce((sum, vote) => sum.add(vote.votingPower), new BN(0));
      const totalVotingPower = directVotingPower.add(delegatedVotingPower);

      groups.push({
        voter: voting.voter,
        name: null,
        decision,
        totalVotingPower,
        directVote: {
          decision,
          voter: voting.voter,
          balance: voting.vote.balance,
          votingPower: directVotingPower,
          conviction,
        },
        delegatedVotes,
      });
    }

    if (votingService.isSplitVote(voting.vote)) {
      const conviction = votingService.getAccountVoteConviction(voting.vote);
      const convictionMultiplier = votingService.getConvictionMultiplier(conviction);

      const ayeVotingPower = votingService.calculateVotingPower(voting.vote.aye, conviction);
      groups.push({
        voter: voting.voter,
        name: null,
        decision: 'aye',
        totalVotingPower: ayeVotingPower,
        directVote: {
          decision: 'aye',
          voter: voting.voter,
          balance: voting.vote.aye,
          votingPower: ayeVotingPower,
          conviction: convictionMultiplier,
        },
        delegatedVotes: [],
      });

      const nayVotingPower = votingService.calculateVotingPower(voting.vote.nay, conviction);
      groups.push({
        voter: voting.voter,
        name: null,
        decision: 'nay',
        totalVotingPower: nayVotingPower,
        directVote: {
          decision: 'nay',
          voter: voting.voter,
          balance: voting.vote.nay,
          votingPower: nayVotingPower,
          conviction: convictionMultiplier,
        },
        delegatedVotes: [],
      });
    }

    if (votingService.isSplitAbstainVote(voting.vote)) {
      const conviction = votingService.getAccountVoteConviction(voting.vote);
      const convictionMultiplier = votingService.getConvictionMultiplier(conviction);

      if (!voting.vote.aye.isZero()) {
        const ayeVotingPower = votingService.calculateVotingPower(voting.vote.aye, conviction);
        groups.push({
          voter: voting.voter,
          name: null,
          decision: 'aye',
          totalVotingPower: ayeVotingPower,
          directVote: {
            decision: 'aye',
            voter: voting.voter,
            balance: voting.vote.aye,
            votingPower: ayeVotingPower,
            conviction: convictionMultiplier,
          },
          delegatedVotes: [],
        });
      }

      if (!voting.vote.nay.isZero()) {
        const nayVotingPower = votingService.calculateVotingPower(voting.vote.nay, conviction);
        groups.push({
          voter: voting.voter,
          name: null,
          decision: 'nay',
          totalVotingPower: nayVotingPower,
          directVote: {
            decision: 'nay',
            voter: voting.voter,
            balance: voting.vote.nay,
            votingPower: nayVotingPower,
            conviction: convictionMultiplier,
          },
          delegatedVotes: [],
        });
      }

      const abstainVotingPower = votingService.calculateVotingPower(voting.vote.abstain, conviction);
      groups.push({
        voter: voting.voter,
        name: null,
        decision: 'abstain',
        totalVotingPower: abstainVotingPower,
        directVote: {
          decision: 'abstain',
          voter: voting.voter,
          balance: voting.vote.abstain,
          votingPower: abstainVotingPower,
          conviction: convictionMultiplier,
        },
        delegatedVotes: [],
      });
    }
  }

  return groups;
};

export const votingListService = {
  getDecoupledVotesFromVote,
  getDecoupledVotesFromVotingHistory,
  getVoteGroupsFromVotingHistory,
};
