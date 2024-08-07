import { BN, BN_ZERO } from '@polkadot/util';

import {
  type AccountVote,
  type Address,
  type CastingVoting,
  type Conviction,
  type DelegatingVoting,
  type ReferendumId,
  type SplitAbstainVote,
  type SplitVote,
  type StandardVote,
  type Tally,
  type Voting,
  type VotingMap,
} from '@/shared/core';
import { toKeysRecord } from '@shared/lib/utils';

enum ConvictionMultiplier {
  None = 0.1,
  Locked1x = 1,
  Locked2x = 2,
  Locked3x = 3,
  Locked4x = 4,
  Locked5x = 5,
  Locked6x = 6,
}

const getAccountVoteConviction = (vote: AccountVote): Conviction => {
  if (isStandardVote(vote)) {
    return vote.vote.conviction;
  }

  if (isSplitVote(vote) || isSplitAbstainVote(vote)) {
    return 'None';
  }

  return 'None';
};

const getConvictionMultiplier = (conviction: Conviction): number => ConvictionMultiplier[conviction];

const getConviction = (conviction: number): Conviction => {
  return ({
    0.1: 'None',
    1: 'Locked1x',
    2: 'Locked2x',
    3: 'Locked3x',
    4: 'Locked4x',
    5: 'Locked5x',
    6: 'Locked6x',
  }[conviction] || 'None') as Conviction;
};

const getVoteFractions = (tally: Tally, approve: BN) => {
  const total = tally.ayes.add(tally.nays);

  const aye = tally.ayes.muln(10_000_000).div(total).toNumber() / 100_000;
  const nay = tally.nays.muln(10_000_000).div(total).toNumber() / 100_000;
  const pass = parseInt(approve.toString().slice(0, 8)) / 1000000;

  return { aye, nay, pass };
};

const getVotedCount = (tally: Tally, threshold: BN) => ({
  voted: tally.support,
  threshold,
});

const isReferendumVoted = (referendumId: ReferendumId, voting: VotingMap) => {
  for (const votingMap of Object.values(voting)) {
    for (const voting of Object.values(votingMap)) {
      if (isCasting(voting)) {
        const referendumVote = voting.casting.votes[referendumId];
        if (referendumVote) {
          return true;
        }
      }
    }
  }

  return false;
};

const getReferendumAccountVotes = (referendumId: ReferendumId, voting: VotingMap) => {
  const res: Record<Address, AccountVote> = {};

  for (const [address, votingMap] of Object.entries(voting)) {
    for (const voting of Object.values(votingMap)) {
      if (isCasting(voting)) {
        const referendumVote = voting.casting.votes[referendumId];
        if (referendumVote) {
          res[address] = referendumVote;
        }
      }
    }
  }

  return res;
};

const getReferendumAccountVotesForAddresses = (referendumId: ReferendumId, addresses: Address[], voting: VotingMap) => {
  const allVotes = getReferendumAccountVotes(referendumId, voting);
  const addressesMap = toKeysRecord(addresses);
  const res: Record<Address, AccountVote> = {};

  for (const [address, vote] of Object.entries(allVotes)) {
    if (address in addressesMap) {
      res[address] = vote;
    }
  }

  return res;
};

const calculateVotingPower = (balance: BN, conviction: Conviction) => {
  const votingCoefficient = getConvictionMultiplier(conviction);

  if (votingCoefficient < 1) {
    return balance.muln(votingCoefficient * 100).idivn(100);
  }

  return balance.muln(votingCoefficient);
};

const calculateAccountVotePower = (vote: AccountVote) => {
  const conviction = getAccountVoteConviction(vote);

  if (isStandardVote(vote)) {
    return calculateVotingPower(vote.balance, conviction);
  }

  if (isSplitVote(vote)) {
    return calculateVotingPower(vote.aye, conviction).iadd(calculateVotingPower(vote.nay, conviction));
  }

  if (isSplitAbstainVote(vote)) {
    return calculateVotingPower(vote.aye, conviction)
      .iadd(calculateVotingPower(vote.nay, conviction))
      .iadd(calculateVotingPower(vote.abstain, conviction));
  }

  return BN_ZERO;
};

const calculateAccountVotesTotalBalance = (votes: AccountVote[]) => {
  return votes.reduce((acc, vote) => acc.iadd(calculateAccountVotePower(vote)), new BN(0));
};

// Voting types

const isCasting = (voting: Voting): voting is CastingVoting => voting.type === 'casting';

const isDelegating = (voting: Voting): voting is DelegatingVoting => voting.type === 'delegating';

// Voted types

const isStandardVote = (vote: AccountVote): vote is StandardVote => vote.type === 'standard';

const isSplitVote = (vote: AccountVote): vote is SplitVote => vote.type === 'split';

const isSplitAbstainVote = (vote: AccountVote): vote is SplitAbstainVote => vote.type === 'splitAbstain';

export const votingService = {
  isCasting,
  isDelegating,
  isStandardVote,
  isSplitVote,
  isSplitAbstainVote,
  isReferendumVoted,

  getAccountVoteConviction,
  getConvictionMultiplier,
  getConviction,
  getVotedCount,
  getVoteFractions,

  getReferendumAccountVotes,
  getReferendumAccountVotesForAddresses,

  calculateVotingPower,
  calculateAccountVotePower,
  calculateAccountVotesTotalBalance,
};
