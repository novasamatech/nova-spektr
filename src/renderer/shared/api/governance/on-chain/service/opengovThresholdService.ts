import { BN, bnMin, bnMax, BN_BILLION } from '@polkadot/util';

import type { IVotingThreshold, SupportParams, AyesParams } from '../lib/threshold-types';
import type {
  VotingThreshold,
  VotingCurve,
  LinearDecreasingCurve,
  SteppedDecreasingCurve,
  ReciprocalCurve,
  BlockHeight,
} from '@shared/core';

export const opengovThresholdService: IVotingThreshold = {
  supportThreshold,
  ayesFractionThreshold,
};

function supportThreshold({
  supportCurve,
  tally,
  totalIssuance,
  blockDifference,
  decisionPeriod,
}: SupportParams): VotingThreshold {
  const threshold = getThreshold(supportCurve, blockDifference, decisionPeriod);
  const supportNeeded = totalIssuance.mul(threshold).div(BN_BILLION);

  return {
    value: supportNeeded,
    passing: tally.support.gte(supportNeeded),
  };
}

function ayesFractionThreshold({ approvalCurve, tally, blockDifference, decisionPeriod }: AyesParams): VotingThreshold {
  const threshold = getThreshold(approvalCurve, blockDifference, decisionPeriod);
  const ayeFraction = BN_BILLION.mul(tally.ayes).div(tally.ayes.add(tally.nays));

  return {
    value: threshold,
    passing: ayeFraction.gte(threshold),
  };
}

function getThreshold(curve: VotingCurve, input: BlockHeight, decisionPeriod: BN): BN {
  if (decisionPeriod.isZero()) return BN_BILLION;

  const x = BN_BILLION.muln(input).div(decisionPeriod);

  if (curve.type === 'LinearDecreasing') {
    const linear = curve as LinearDecreasingCurve;

    // *ceil - (x.min(*length).saturating_div(*length, Down) * (*ceil - *floor))
    // NOTE: We first multiply, then divide (since we work with fractions)
    return linear.ceil.sub(bnMin(x, linear.length).mul(linear.ceil.sub(linear.floor)).div(linear.length));
  }

  if (curve.type === 'SteppedDecreasing') {
    const stepped = curve as SteppedDecreasingCurve;

    // (*begin - (step.int_mul(x.int_div(*period))).min(*begin)).max(*end)
    return bnMax(stepped.end, stepped.begin.sub(bnMin(stepped.begin, stepped.step.mul(x).div(stepped.period))));
  }

  if (curve.type === 'Reciprocal') {
    const reciprocal = curve as ReciprocalCurve;
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
