import { type BN } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';

import { DECAY_RATE, INTEREST_IDEAL, MINIMUM_INFLATION, STAKED_PORTION_IDEAL } from '../constants';

const PERBILL = 1_000_000_000;

/**
 * Yearly inflation predicted by the classic NPoS reward curve.
 *
 * Only used as a fallback when the chain exposes neither the inflation runtime
 * API nor a realized era payout - chains with a fixed inflation model (Polkadot
 * after ref. 1139) are not described by this curve.
 */
export function calculateYearlyInflation(stakedPortion: number): number {
  const calculatedInflation =
    stakedPortion <= STAKED_PORTION_IDEAL
      ? stakedPortion * (INTEREST_IDEAL - MINIMUM_INFLATION / STAKED_PORTION_IDEAL)
      : (INTEREST_IDEAL * STAKED_PORTION_IDEAL - MINIMUM_INFLATION) *
        Math.pow(2, (STAKED_PORTION_IDEAL - stakedPortion) / DECAY_RATE);

  return MINIMUM_INFLATION + calculatedInflation;
}

type AvgRewardPercentParams = {
  yearlyInflation: number;
  stakedPortion: number;
};

/**
 * Gross yearly reward rate of the staked pool, as a fraction (0.05 = 5%).
 */
export function calculateAvgRewardPercent({ yearlyInflation, stakedPortion }: AvgRewardPercentParams): number {
  if (stakedPortion <= 0) return 0;

  return yearlyInflation / stakedPortion;
}

type ValidatorApyParams = {
  /** Total stake behind the validator, in planck. */
  totalStake: BigNumber.Value;
  /** Validator commission, in percent (0..100). */
  commission: number;
  /** Average stake per validator in the era, in planck. */
  avgStake: BigNumber.Value;
  /** Gross yearly reward rate of the staked pool, as a fraction. */
  avgRewardPercent: number;
};

/**
 * APY of a single validator, in percent.
 *
 * Rewards are paid per validator regardless of its stake, so a validator with a
 * below-average stake pays a proportionally higher rate to its nominators.
 */
export function calculateValidatorApy({
  totalStake,
  commission,
  avgStake,
  avgRewardPercent,
}: ValidatorApyParams): number {
  const stake = new BigNumber(totalStake);
  if (!stake.isFinite() || stake.isLessThanOrEqualTo(0)) return 0;

  const yearlyRewardPercent = new BigNumber(avgStake).multipliedBy(avgRewardPercent).div(stake);

  return toPercent(yearlyRewardPercent.multipliedBy(1 - commission / 100));
}

/**
 * Median commission of the profitable validators, in percent.
 *
 * Validators taking the whole reward (100%) never pay their nominators, and
 * zero-commission validators are usually short-lived promotions - both are
 * excluded so the median describes what a nominator realistically pays.
 */
export function getMedianCommission(commissions: number[]): number {
  const profitable = commissions.filter(commission => commission > 0 && commission < 100).sort((a, b) => a - b);

  if (profitable.length === 0) return 0;

  const lower = profitable[(profitable.length - 1) >> 1] ?? 0;
  const upper = profitable[profitable.length >> 1] ?? 0;

  return (lower + upper) / 2;
}

/**
 * Network APY a nominator can expect, in percent.
 */
export function calculateExpectedApy(avgRewardPercent: number, medianCommission: number): number {
  return toPercent(new BigNumber(avgRewardPercent).multipliedBy(1 - medianCommission / 100));
}

/**
 * Perbill-encoded commission (1e9 = 100%) as a percent value (0..100).
 */
export function perbillToPercent(commission: BN): number {
  return new BigNumber(commission.toString()).div(PERBILL).multipliedBy(100).toNumber();
}

function toPercent(fraction: BigNumber): number {
  return Number(fraction.multipliedBy(100).toFixed(2));
}
