import { BN } from '@polkadot/util';

import {
  type AccountVote,
  type Address,
  type CastingVoting,
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
      return acc.iadd(vote.balance);
    }

    if (isSplitVote(vote)) {
      return acc.iadd(vote.aye).iadd(vote.nay);
    }

    if (isSplitAbstainVote(vote)) {
      return acc.iadd(vote.aye).iadd(vote.nay).iadd(vote.abstain);
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

  getVotedCount,
  getVoteFractions,
  isReferendumVoted,
  getAllReferendumVotes,
  getReferendumVotesForAddresses,
  getVotesTotalBalance,
};
