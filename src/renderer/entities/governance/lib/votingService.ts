import { BN, BN_ZERO } from '@polkadot/util';
import isEmpty from 'lodash/isEmpty';

import {
  type AccountVote,
  type Address,
  type CastingVoting,
  type Chain,
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

const convictionList = [
  'None',
  'Locked1x',
  'Locked2x',
  'Locked3x',
  'Locked4x',
  'Locked5x',
  'Locked6x',
] as const satisfies Conviction[];

const getConvictionList = () => convictionList;

const getAccountVoteConviction = (vote: AccountVote): Conviction => {
  if (isStandardVote(vote)) {
    return vote.vote.conviction;
  }

  if (isSplitVote(vote)) {
    return 'Locked1x';
  }

  if (isSplitAbstainVote(vote)) {
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
  const pass = parseInt(approve.toString().slice(0, 8)) / 1_000_000;
  const total = tally.ayes.add(tally.nays);

  if (total.isZero()) {
    return {
      aye: 0,
      nay: 0,
      pass,
    };
  }

  const aye = tally.ayes.muln(100_000).div(total).toNumber() / 1000;
  const nay = tally.nays.muln(100_000).div(total).toNumber() / 1000;

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
        const referendumVote = voting.votes[referendumId];
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
        const referendumVote = voting.votes[referendumId];
        if (referendumVote) {
          res[address] = referendumVote;
        }
      }
    }
  }

  return res;
};

const getReferendumVoting = (referendumId: ReferendumId, voting: VotingMap) => {
  const res: Record<Address, Voting> = {};

  for (const [address, votingMap] of Object.entries(voting)) {
    for (const voting of Object.values(votingMap)) {
      if (isCasting(voting)) {
        if (referendumId in voting.votes) {
          res[address] = voting;
        }
      }
    }
  }

  return res;
};

const getReferendumVote = (referendumId: ReferendumId, address: Address, voting: VotingMap) => {
  for (const [votingAddress, votingMap] of Object.entries(voting)) {
    if (votingAddress !== address) {
      continue;
    }

    for (const voting of Object.values(votingMap)) {
      if (isCasting(voting)) {
        if (referendumId in voting.votes) {
          return voting.votes[referendumId];
        }
      }
    }
  }

  return null;
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

const calculateAccountVoteAmount = (vote: AccountVote) => {
  if (isStandardVote(vote)) {
    return vote.balance;
  }

  if (isSplitVote(vote)) {
    return vote.aye.add(vote.nay);
  }

  if (isSplitAbstainVote(vote)) {
    return vote.aye.add(vote.nay).add(vote.abstain);
  }

  return BN_ZERO;
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

const getVotingAsset = (chain: Chain) => chain.assets.at(0) ?? null;

// Voting types

const isCasting = (voting: Voting): voting is CastingVoting => voting.type === 'Casting';

const isDelegating = (voting: Voting): voting is DelegatingVoting => voting.type === 'Delegating';

// Voted types

const isStandardVote = (vote: AccountVote): vote is StandardVote => vote.type === 'Standard';

const isSplitVote = (vote: AccountVote): vote is SplitVote => vote.type === 'Split';

const isSplitAbstainVote = (vote: AccountVote): vote is SplitAbstainVote => vote.type === 'SplitAbstain';

// Vote status

const isUnlockingDelegation = (vote: CastingVoting): boolean => isEmpty(vote.votes);

export const votingService = {
  isCasting,
  isDelegating,
  isStandardVote,
  isSplitVote,
  isSplitAbstainVote,
  isReferendumVoted,

  isUnlockingDelegation,

  getConvictionList,
  getAccountVoteConviction,
  getConvictionMultiplier,
  getConviction,
  getVotedCount,
  getVoteFractions,
  getVotingAsset,

  getReferendumVote,
  getReferendumVoting,
  getReferendumAccountVotes,
  getReferendumAccountVotesForAddresses,

  calculateVotingPower,
  calculateAccountVotePower,
  calculateAccountVoteAmount,
  calculateAccountVotesTotalBalance,
};
