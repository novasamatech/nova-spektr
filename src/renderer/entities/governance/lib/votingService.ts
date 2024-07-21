import { type BN, BN_ZERO } from '@polkadot/util';

import { onChainUtils } from '@/shared/api/governance';
import {
  type AccountVote,
  type Address,
  type ReferendumId,
  type Tally,
  type TrackId,
  type Voting,
  type VotingMap,
} from '@/shared/core';

const getVoteFractions = (tally: Tally, approve: BN): Record<'aye' | 'nay' | 'pass', number> => {
  const total = tally.ayes.add(tally.nays);

  const aye = tally.ayes.muln(10_000_000).div(total).toNumber() / 100_000;
  const nay = tally.nays.muln(10_000_000).div(total).toNumber() / 100_000;
  const pass = parseInt(approve.toString().slice(0, 8)) / 1000000;

  return { aye, nay, pass };
};

function getVotedCount(tally: Tally, threshold: BN) {
  return {
    voted: tally.support,
    of: threshold,
  };
}

const isReferendumVoted = (referendumId: ReferendumId, votings: Record<Address, Record<TrackId, Voting>>): boolean => {
  for (const votingMap of Object.values(votings)) {
    for (const voting of Object.values(votingMap)) {
      if (onChainUtils.isCasting(voting) && voting.casting.votes[referendumId]) {
        return true;
      }
    }
  }

  return false;
};

const getAllReferendumVotes = (referendumId: ReferendumId, votings: VotingMap) => {
  const res: Record<Address, AccountVote> = {};

  for (const [address, votingMap] of Object.entries(votings)) {
    for (const voting of Object.values(votingMap)) {
      if (onChainUtils.isCasting(voting) && voting.casting.votes[referendumId]) {
        res[address] = voting.casting.votes[referendumId];
      }
    }
  }

  return res;
};

const getReferendumVotesForAddresses = (referendumId: ReferendumId, addresses: Address[], votings: VotingMap) => {
  const res: Record<Address, AccountVote> = {};

  for (const [address, votingMap] of Object.entries(votings)) {
    if (addresses.includes(address)) {
      continue;
    }
    for (const voting of Object.values(votingMap)) {
      if (onChainUtils.isCasting(voting) && voting.casting.votes[referendumId]) {
        res[address] = voting.casting.votes[referendumId];
      }
    }
  }

  return res;
};

const getVotesTotalBalance = (votes: Record<Address, AccountVote>) => {
  return Object.values(votes).reduce((acc, vote) => {
    if (onChainUtils.isStandardVote(vote)) {
      return acc.add(vote.balance);
    }

    if (onChainUtils.isSplitVote(vote)) {
      return acc.add(vote.aye).add(vote.nay);
    }

    if (onChainUtils.isSplitAbstainVote(vote)) {
      return acc.add(vote.aye).add(vote.nay).add(vote.abstain);
    }

    return acc;
  }, BN_ZERO);
};

export const votingService = {
  getVotedCount,
  getVoteFractions,
  isReferendumVoted,
  getAllReferendumVotes,
  getReferendumVotesForAddresses,
  getVotesTotalBalance,
};
