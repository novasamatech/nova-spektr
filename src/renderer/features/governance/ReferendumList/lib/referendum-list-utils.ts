import { BN } from '@polkadot/util';
import orderBy from 'lodash/orderBy';

import { IconNames } from '@shared/ui/Icon/data';
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
  getTrackInfo,
  isReferendumVoted,
};

function getSortedOngoing(referendums: Map<ReferendumId, OngoingReferendum>): Map<ReferendumId, OngoingReferendum> {
  return referendums;
}

function getSortedCompleted(
  referendums: Map<ReferendumId, CompletedReferendum>,
): Map<ReferendumId, CompletedReferendum> {
  // return new Map();
  return new Map(orderBy(Array.from(referendums), ([index]) => parseInt(index), 'desc'));
}

function getVoteFractions(tally: Tally, approve: BN): Record<'aye' | 'nay' | 'pass', number> {
  const total = tally.ayes.add(tally.nays);

  const aye = tally.ayes.muln(10000000).div(total).toNumber() / 100000;
  const nay = tally.nays.muln(10000000).div(total).toNumber() / 100000;
  const pass = parseInt(approve.toString().slice(0, 8)) / 1000000;

  return { aye, nay, pass };
}

function getTrackInfo(trackId: TrackId): { title: string; icon: IconNames } {
  const names: Record<TrackId, { title: string; icon: IconNames }> = {
    0: { title: 'Main agenda', icon: 'polkadot' }, // 'root',
    1: { title: 'Fellowship: Whitelist', icon: 'fellowship' }, // 'whitelisted_caller',
    2: { title: 'Wish for change', icon: 'voting' }, // 'wish_for_change',
    10: { title: 'Staking', icon: 'stake' }, // 'staking_admin',
    11: { title: 'Treasury: Any', icon: 'treasury' }, // 'treasurer',
    12: { title: 'Governance: Lease', icon: 'voting' }, // 'lease_admin',
    13: { title: 'Fellowship: Admin', icon: 'fellowship' }, // 'fellowship_admin',
    14: { title: 'Governance: Registrar', icon: 'voting' }, // 'general_admin',
    15: { title: 'Crowdloans', icon: 'rocket' }, // 'auction_admin',
    20: { title: 'Governance: Canceller', icon: 'voting' }, // 'referendum_canceller',
    21: { title: 'Governance: killer', icon: 'voting' }, // 'referendum_killer',
    30: { title: 'Treasury: Small tips', icon: 'treasury' }, // 'small_tipper',
    31: { title: 'Treasury: Big tips', icon: 'treasury' }, // 'big_tipper',
    32: { title: 'Treasury: Small spend', icon: 'treasury' }, // 'small_spender',
    33: { title: 'Treasury: Medium spend', icon: 'treasury' }, // 'medium_spender',
    34: { title: 'Treasury: Big spend', icon: 'treasury' }, // 'big_spender',
  };

  return names[trackId] || { title: 'Unknown track', icon: 'voting' };
}

function isReferendumVoted(index: ReferendumId, votings: Record<Address, Record<TrackId, Voting>>): boolean {
  return Object.values(votings).some((votingMap) => {
    return Object.values(votingMap).some((voting) => {
      if (voting.type !== VotingType.CASTING) return false;

      return Boolean((voting as CastingVoting).casting.votes[index]);
    });
  });
}
