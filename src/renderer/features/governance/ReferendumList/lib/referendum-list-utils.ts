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

function getTrackInfo(trackId: TrackId): { title: string; icon: IconNames } {
  const names: Record<TrackId, { title: string; icon: IconNames }> = {
    0: { title: 'governance.referendums.mainAgenda', icon: 'polkadot' }, // 'root',
    1: { title: 'governance.referendums.fellowshipWhitelist', icon: 'fellowship' }, // 'whitelisted_caller',
    2: { title: 'governance.referendums.wishForChange', icon: 'voting' }, // 'wish_for_change',
    10: { title: 'governance.referendums.staking', icon: 'stake' }, // 'staking_admin',
    11: { title: 'governance.referendums.treasuryAny', icon: 'treasury' }, // 'treasurer',
    12: { title: 'governance.referendums.governanceLease', icon: 'voting' }, // 'lease_admin',
    13: { title: 'governance.referendums.fellowshipAdmin', icon: 'fellowship' }, // 'fellowship_admin',
    14: { title: 'governance.referendums.governanceRegistrar', icon: 'voting' }, // 'general_admin',
    15: { title: 'governance.referendums.crowdloans', icon: 'rocket' }, // 'auction_admin',
    20: { title: 'governance.referendums.governanceCanceller', icon: 'voting' }, // 'referendum_canceller',
    21: { title: 'governance.referendums.governanceKiller', icon: 'voting' }, // 'referendum_killer',
    30: { title: 'governance.referendums.treasurySmallTips', icon: 'treasury' }, // 'small_tipper',
    31: { title: 'governance.referendums.treasuryBigTips', icon: 'treasury' }, // 'big_tipper',
    32: { title: 'governance.referendums.treasurySmallSpend', icon: 'treasury' }, // 'small_spender',
    33: { title: 'governance.referendums.treasuryMediumSpend', icon: 'treasury' }, // 'medium_spender',
    34: { title: 'governance.referendums.treasuryBigSpend', icon: 'treasury' }, // 'big_spender',
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
