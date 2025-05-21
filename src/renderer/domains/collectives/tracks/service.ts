import { BN, BN_BILLION, BN_ONE, bnMax, bnMin } from '@polkadot/util';
import { capitalize } from 'lodash';

import { fromRomanNumeral } from '@/shared/lib/utils';
import { type TrackId } from '@/shared/pallet/referenda';
import { type CollectivePalletsType } from '../_lib/types';
import { calculateVoteWeightPipeline } from '../configuration/inject';
import { type Member } from '../member/types';
import { type Tally } from '../referendum/types';

import { type Track, type VotingCurve, type VotingThreshold } from './types';

function isRetentionTrack(track: TrackId) {
  return track >= 11 && track <= 16;
}

function isPromotionTrack(track: TrackId) {
  return (
    // Promotion
    (track >= 21 && track <= 26) || isFastPromotionTrack(track)
  );
}

function isFastPromotionTrack(track: TrackId) {
  return track >= 31 && track <= 36;
}

/**
 * @see https://github.com/paritytech/polkadot-sdk/blob/master/cumulus/parachains/runtimes/collectives/collectives-westend/src/fellowship/tracks.rs#L63
 */
function getMinimumRank(track: TrackId, maxRank: number) {
  if (track >= 0 && track <= 9) {
    return track;
  }

  if (track >= 11 && track <= 16) {
    return track - 8;
  }

  if (track >= 21 && track <= 26) {
    return track - 18;
  }

  if (track >= 31 && track <= 36) {
    return track - 28;
  }

  return maxRank;
}

function getExcessRank(rank: number, maxRank: number, track: TrackId) {
  return rank - getMinimumRank(track, maxRank);
}

/**
 * @see https://github.com/paritytech/polkadot-sdk/blob/34352e82cf557f20375c1757a2d934e3a9d2a6b0/substrate/frame/ranked-collective/src/lib.rs#L238
 * Not meant to be used directly, use getVoteWeight method instead.
 */
function getGeometricVoteWeight(excessRank: number) {
  const v = excessRank + 1;

  return (v * (v + 1)) / 2;
}

/**
 * @see https://github.com/paritytech/polkadot-sdk/blob/34352e82cf557f20375c1757a2d934e3a9d2a6b0/substrate/frame/ranked-collective/src/lib.rs#L223
 * Not meant to be used directly, use getVoteWeight method instead.
 */
function getLinearVoteWeight(excessRank: number) {
  return excessRank + 1;
}

function getVoteWeight({
  pallet,
  rank,
  maxRank,
  track,
}: {
  pallet: CollectivePalletsType;
  rank: number;
  maxRank: number;
  track: TrackId;
}) {
  const excessRank = getExcessRank(rank, maxRank, track);
  return calculateVoteWeightPipeline(0, { pallet, excessRank });
}

function getThreshold(curve: VotingCurve, minRank: number, maxRank: number): BN {
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
}

type SupportParams = {
  track: Track;
  maxRank: number;
  members: Member[];
  tally: Tally;
};

function supportThreshold({ track, members, maxRank, tally }: SupportParams): VotingThreshold {
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
}

type ApprovalParams = {
  track: Track;
  maxRank: number;
  tally: Tally;
};

function approvalThreshold({ track, maxRank, tally }: ApprovalParams): VotingThreshold {
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
}

function rankSatisfiesVotingThreshold(rank: number, maxRank: number, track: TrackId) {
  return getExcessRank(rank, maxRank, track) >= 0;
}

function getReferendumTrackFromRank(tracks: Track[], rank: number, wish: 'Promotion' | 'Retention') {
  if (wish === 'Retention') {
    // retention range
    const retentionTrack = rank + 10;
    return tracks.find(track => track.id === retentionTrack) ?? null;
  }
  if (wish === 'Promotion') {
    // promotion track range + 1
    const promotionTrack = rank + 21;
    return tracks.find(track => track.id === promotionTrack) ?? null;
  }
  return null;
}

function originNameFromTrack(track: Track): string {
  if (isRetentionTrack(track.id)) {
    const match = track.name.match(/retain at ([A-Z]+) Dan/);
    if (match) {
      const roman = match[1];
      if (roman) {
        const num = fromRomanNumeral(roman);
        return `RetainAt${num}Dan`;
      }
    }
  }
  if (isFastPromotionTrack(track.id)) {
    const match = track.name.match(/fast promote to ([A-Z]+) Dan/);
    if (match) {
      const roman = match[1];
      if (roman) {
        const num = fromRomanNumeral(roman);
        return `Fellowship${num}Dan`;
      }
    }
  }
  if (isPromotionTrack(track.id)) {
    const match = track.name.match(/promote to ([A-Z]+) Dan/);
    if (match) {
      const roman = match[1];
      if (roman) {
        const num = fromRomanNumeral(roman);
        return `PromoteTo${num}Dan`;
      }
    }
  }

  return capitalize(track.name);
}

export const getProposalTrack = (tracks: Track[], proposerMember: Member, wish: 'Promotion' | 'Retention'): number => {
  if (wish === 'Retention') {
    const currentTrack = tracks.find(t => t.id === proposerMember.rank);
    return currentTrack?.id ?? 0;
  }

  if (wish === 'Promotion') {
    const nextTrack = tracks.find(t => t.id === proposerMember.rank + 1);
    return nextTrack?.id ?? 0;
  }

  return 0;
};

export const trackService = {
  isRetentionTrack,
  isPromotionTrack,

  getMinimumRank,
  getExcessRank,
  getLinearVoteWeight,
  getGeometricVoteWeight,
  getVoteWeight,
  getThreshold,
  supportThreshold,
  approvalThreshold,
  rankSatisfiesVotingThreshold,
  getReferendumTrackFromRank,
  originNameFromTrack,
  getProposalTrack,
};
