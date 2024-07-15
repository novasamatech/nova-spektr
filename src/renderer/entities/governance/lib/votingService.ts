import { BN } from '@polkadot/util';

import {
  type Address,
  type CastingVoting,
  type ReferendumId,
  type Tally,
  type TrackId,
  type Voting,
  VotingType,
} from '@shared/core';

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

const isReferendumVoted = (index: ReferendumId, votings: Record<Address, Record<TrackId, Voting>>): boolean => {
  for (const votingMap of Object.values(votings)) {
    for (const voting of Object.values(votingMap)) {
      if (voting.type === VotingType.CASTING && (voting as CastingVoting).casting.votes[index]) {
        return true;
      }
    }
  }

  return false;
};

export const votingService = {
  getVotedCount,
  getVoteFractions,
  isReferendumVoted,
};
