import { BN } from '@polkadot/util';
import orderBy from 'lodash/orderBy';

import {
  ReferendumId,
  OngoingReferendum,
  CompletedReferendum,
  TrackId,
  Tally,
  Voting,
  VotingType,
  CastingVoting,
  type Address,
} from '@shared/core';

export const referendumListUtils = {
  getSortedOngoing,
  getSortedCompleted,
  getVoteFractions,
  isReferendumVoted,
};

// TODO: use block number to make an appropriate sorting
function getSortedOngoing(referendums: Map<ReferendumId, OngoingReferendum>): Map<ReferendumId, OngoingReferendum> {
  return new Map(orderBy(Array.from(referendums), ([index]) => parseInt(index), 'desc'));
}

// TODO: use block number to make an appropriate sorting
function getSortedCompleted(
  referendums: Map<ReferendumId, CompletedReferendum>,
): Map<ReferendumId, CompletedReferendum> {
  return new Map(orderBy(Array.from(referendums), ([index]) => parseInt(index), 'desc'));
}

function getVoteFractions(tally: Tally, approve: BN): Record<'aye' | 'nay' | 'pass', number> {
  const total = tally.ayes.add(tally.nays);

  const aye = tally.ayes.muln(10000000).div(total).toNumber() / 100000;
  const nay = tally.nays.muln(10000000).div(total).toNumber() / 100000;
  const pass = parseInt(approve.toString().slice(0, 8)) / 1000000;

  return { aye, nay, pass };
}

function isReferendumVoted(index: ReferendumId, votings: Record<Address, Record<TrackId, Voting>>): boolean {
  return Object.values(votings).some((votingMap) => {
    return Object.values(votingMap).some((voting) => {
      if (voting.type !== VotingType.CASTING) return false;

      return Boolean((voting as CastingVoting).casting.votes[index]);
    });
  });
}
