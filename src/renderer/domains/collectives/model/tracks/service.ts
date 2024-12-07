import { BN, BN_BILLION, BN_ONE, bnMax, bnMin } from '@polkadot/util';

import { type TrackId } from '@/shared/pallet/referenda';
import { type Member } from '../members/types';
import { type Tally } from '../referendum/types';

import { type Track, type VotingCurve, type VotingThreshold } from './types';

/**
 * @see https://github.com/paritytech/polkadot-sdk/blob/master/cumulus/parachains/runtimes/collectives/collectives-westend/src/fellowship/tracks.rs#L63
 */
const getMinimumRank = (trackId: TrackId, maxRank: number) => {
  if (trackId >= 0 && trackId <= 9) {
    return trackId;
  }

  if (trackId >= 11 && trackId <= 16) {
    return trackId - 8;
  }

  if (trackId >= 21 && trackId <= 26) {
    return trackId - 18;
  }

  if (trackId >= 31 && trackId <= 36) {
    return trackId - 28;
  }

  return maxRank;
};

/**
 * @see https://github.com/paritytech/polkadot-sdk/blob/34352e82cf557f20375c1757a2d934e3a9d2a6b0/substrate/frame/ranked-collective/src/lib.rs#L238
 */
const getGeometricVoteWeight = (rank: number) => {
  const v = rank + 1;

  return (v * (v + 1)) / 2;
};

/**
 * @see https://github.com/paritytech/polkadot-sdk/blob/34352e82cf557f20375c1757a2d934e3a9d2a6b0/substrate/frame/ranked-collective/src/lib.rs#L223
 */
const getLinearVoteWeight = (rank: number) => {
  return rank + 1;
};

const getThreshold = (curve: VotingCurve, minRank: number, maxRank: number): BN => {
  const x = BN_BILLION.muln(maxRank).divn(minRank);

  if (curve.type === 'LinearDecreasing') {
    const linear = curve;

    const range = linear.ceil.sub(linear.floor);
    const boundedValue = bnMin(x, linear.length);

    // *ceil - (x.min(*length).saturating_div(*length, Down) * (*ceil - *floor))
    // NOTE: We first multiply, then divide (since we work with fractions)
    return linear.ceil.sub(boundedValue.mul(range).div(linear.length));
  }

  if (curve.type === 'SteppedDecreasing') {
    const stepped = curve;

    // (*begin - (step.int_mul(x.int_div(*period))).min(*begin)).max(*end)
    return bnMax(stepped.end, stepped.begin.sub(bnMin(stepped.begin, stepped.step.mul(x).div(stepped.period))));
  }

  if (curve.type === 'Reciprocal') {
    const reciprocal = curve;
    const div = x.add(reciprocal.xOffset);

    if (div.isZero()) return BN_BILLION;

    // factor
    //   .checked_rounding_div(FixedI64::from(x) + *x_offset, Low)
    //   .map(|yp| (yp + *y_offset).into_clamped_perthing())
    //   .unwrap_or_else(Perbill::one)
    return bnMin(BN_BILLION, reciprocal.factor.mul(BN_BILLION).div(div).add(reciprocal.yOffset));
  }

  return BN_BILLION;
};

type SupportParams = {
  track: Track;
  maxRank: number;
  members: Member[];
  tally: Tally;
};

const supportThreshold = ({ track, members, maxRank, tally }: SupportParams): VotingThreshold => {
  const minRank = getMinimumRank(track.id, maxRank);
  const membersWithRank = members.reduce((acc, member) => (member.rank >= minRank ? acc + 1 : acc), 0);

  const bareAyes = new BN(tally.bareAyes);
  const support = bareAyes.mul(BN_BILLION).divn(membersWithRank);
  const threshold = getThreshold(track.minSupport, minRank, maxRank);

  return {
    value: support,
    threshold,
    passing: support.gte(threshold),
    curve: track.minSupport,
  };
};

type ApprovalParams = {
  track: Track;
  maxRank: number;
  tally: Tally;
};

const approvalThreshold = ({ track, maxRank, tally }: ApprovalParams): VotingThreshold => {
  const minRank = getMinimumRank(track.id, maxRank);

  const ayes = new BN(tally.ayes);
  const nays = new BN(tally.nays);
  const total = BN.max(BN_ONE, ayes.add(nays));
  const threshold = getThreshold(track.minApproval, minRank, maxRank);
  const approval = ayes.mul(BN_BILLION).div(total);

  return {
    value: approval,
    threshold,
    passing: approval.gte(threshold),
    curve: track.minApproval,
  };
};

const rankSatisfiesVotingThreshold = (rank: number, maxRank: number, trackId: TrackId) => {
  return getMinimumRank(trackId, maxRank) <= rank;
};

export const tracksService = {
  getMinimumRank,
  getLinearVoteWeight,
  getGeometricVoteWeight,
  getThreshold,
  supportThreshold,
  approvalThreshold,
  rankSatisfiesVotingThreshold,
};
