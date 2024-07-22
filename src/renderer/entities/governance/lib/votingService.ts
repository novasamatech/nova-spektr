import { BN } from '@polkadot/util';

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
  type TrackId,
  type Voting,
  type VotingMap,
} from '@/shared/core';
import { toKeysRecord } from '@shared/lib/utils';

const convictions: Record<Conviction, number> = {
  None: 0.1,
  Locked1x: 1,
  Locked2x: 2,
  Locked3x: 3,
  Locked4x: 4,
  Locked5x: 5,
  Locked6x: 6,
};

const calculateVotingPower = (balance: BN, conviction: Conviction) => {
  const votingCoefficient = getVotingPower(conviction);

  if (votingCoefficient < 1) {
    return balance.muln(votingCoefficient * 10).divn(10);
  }

  return balance.muln(votingCoefficient);
};

const getVotingPower = (conviction: Conviction) => {
  return convictions[conviction];
};

const getVoteFractions = (tally: Tally, approve: BN): Record<'aye' | 'nay' | 'pass', number> => {
  const total = tally.ayes.add(tally.nays);

  const aye = tally.ayes.muln(10_000_000).div(total).toNumber() / 100_000;
  const nay = tally.nays.muln(10_000_000).div(total).toNumber() / 100_000;
  const pass = parseInt(approve.toString().slice(0, 8)) / 1000000;

  return { aye, nay, pass };
};

const getVotedCount = (tally: Tally, threshold: BN) => ({
  voted: tally.support,
  of: threshold,
});

const isReferendumVoted = (referendumId: ReferendumId, votings: Record<Address, Record<TrackId, Voting>>): boolean => {
  for (const votingMap of Object.values(votings)) {
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

const getAllReferendumVotes = (referendumId: ReferendumId, votings: VotingMap) => {
  const res: Record<Address, AccountVote> = {};

  for (const [address, votingMap] of Object.entries(votings)) {
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

const getReferendumVotesForAddresses = (referendumId: ReferendumId, addresses: Address[], votings: VotingMap) => {
  const res: Record<Address, AccountVote> = {};
  const addressesMap = toKeysRecord(addresses);

  for (const [address, votingMap] of Object.entries(votings)) {
    if (!(address in addressesMap)) {
      continue;
    }
    for (const voting of Object.values(votingMap)) {
      if (isCasting(voting)) {
        const referendumVote = voting.casting.votes[referendumId];
        if (referendumVote) {
          res[address] = voting.casting.votes[referendumId];
        }
      }
    }
  }

  return res;
};

const getVotesTotalBalance = (votes: Record<Address, AccountVote>) => {
  return Object.values(votes).reduce((acc, vote) => {
    if (isStandardVote(vote)) {
      return acc.iadd(calculateVotingPower(vote.balance, vote.vote.conviction));
    }

    if (isSplitVote(vote)) {
      return acc.iadd(calculateVotingPower(vote.aye, 'None')).iadd(calculateVotingPower(vote.nay, 'None'));
    }

    if (isSplitAbstainVote(vote)) {
      return acc
        .iadd(calculateVotingPower(vote.aye, 'None'))
        .iadd(calculateVotingPower(vote.nay, 'None'))
        .iadd(calculateVotingPower(vote.abstain, 'None'));
    }

    return acc;
  }, new BN(0));
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

  getVotingPower,
  getVotedCount,
  getVoteFractions,
  calculateVotingPower,
  isReferendumVoted,
  getAllReferendumVotes,
  getReferendumVotesForAddresses,
  getVotesTotalBalance,
};
