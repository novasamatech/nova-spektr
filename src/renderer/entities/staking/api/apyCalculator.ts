import { type ApiPromise } from '@polkadot/api';
import BigNumber from 'bignumber.js';

import type { Address } from '@shared/core';

import { DECAY_RATE, INTEREST_IDEAL, MINIMUM_INFLATION, STAKED_PORTION_IDEAL } from '../lib/constants';
import { type ApyValidator } from '../lib/types';

const calculateYearlyInflation = (stakedPortion: number): number => {
  let calculatedInflation;
  if (stakedPortion <= STAKED_PORTION_IDEAL) {
    calculatedInflation = stakedPortion * (INTEREST_IDEAL - MINIMUM_INFLATION / STAKED_PORTION_IDEAL);
  } else {
    calculatedInflation =
      (INTEREST_IDEAL * STAKED_PORTION_IDEAL - MINIMUM_INFLATION) *
      Math.pow(2, (STAKED_PORTION_IDEAL - stakedPortion) / DECAY_RATE);
  }

  return MINIMUM_INFLATION + calculatedInflation;
};

const getTotalIssuance = async (api: ApiPromise): Promise<BigNumber> => {
  const totalIssuance = await api.query.balances.totalIssuance();

  return new BigNumber(totalIssuance.toString());
};

const getAvgRewardPercent = (totalStaked: BigNumber, totalIssuance: BigNumber): number => {
  const stakedPortion = totalStaked.div(totalIssuance).toNumber();
  const yearlyInflation = calculateYearlyInflation(stakedPortion);

  return yearlyInflation / stakedPortion;
};

const getApyForValidators = (
  totalStaked: BigNumber,
  avgRewardPercent: number,
  validators: ApyValidator[],
): Record<Address, number> => {
  const avgStake = totalStaked.div(validators.length);

  return validators.reduce((acc, validator) => {
    const validatorApy = calculateValidatorApy(validator, avgRewardPercent, avgStake);

    return { ...acc, [validator.address]: validatorApy };
  }, {});
};

const calculateValidatorApy = (
  validator: ApyValidator,
  avgRewardPercent: number,
  avgValidatorStake: BigNumber,
): number => {
  const yearlyRewardPercent = avgValidatorStake.multipliedBy(avgRewardPercent).div(validator.totalStake);
  const pureApy = yearlyRewardPercent.multipliedBy(1 - validator.commission / 100);

  return +pureApy.multipliedBy(100).toFixed(2);
};

const getMedianCommission = (validators: ApyValidator[]): number => {
  const profitable = validators
    .map((validator) => validator.commission)
    .filter((commission) => commission && commission < 100)
    .sort((a, b) => a - b);

  if (!profitable.length) {
    return 0;
  }

  return (profitable[(profitable.length - 1) >> 1] + profitable[profitable.length >> 1]) / 2;
};

/**
 * Get APY for list of validators
 * @param api ApiPromise to make RPC calls
 * @param validators list of validators
 * @return {Promise}
 */
export const getValidatorsApy = async (
  api: ApiPromise,
  validators: ApyValidator[],
): Promise<Record<Address, number>> => {
  const totalIssuance = await getTotalIssuance(api);
  const totalStaked = validators.reduce((acc, { totalStake }) => {
    return acc.plus(new BigNumber(totalStake));
  }, new BigNumber(0));

  const avgRewardPercent = getAvgRewardPercent(totalStaked, totalIssuance);

  return getApyForValidators(totalStaked, avgRewardPercent, validators);
};

/**
 * Get average APY
 * @param api ApiPromise to make RPC calls
 * @param validators array of calculated APYs'
 * @return {Promise}
 */
export const getAvgApy = async (api: ApiPromise, validators: ApyValidator[]): Promise<string> => {
  if (validators.length === 0) return '';

  const totalIssuance = await getTotalIssuance(api);
  const stake = validators.reduce((acc, { totalStake }) => {
    return acc.plus(new BigNumber(totalStake));
  }, new BigNumber(0));

  const avgRewardPercent = getAvgRewardPercent(stake, totalIssuance);
  const median = getMedianCommission(validators);

  return (avgRewardPercent * (1 - median / 100) * 100).toFixed(2);
};

// TODO: another APY calculation

// const expectedAPY = (): BN => {
//   return calculateExpectedAPY(getAvgRewardPercent());
// };
//
// const maxAPY = () => {
//   const apyValues = Object.values(apyByValidator());
//
//   return apyValues.reduce((acc, apy) => (apy.gt(acc) ? apy : acc), BN_ZERO);
// };
//
// const calculateExpectedAPY = (avgValidatorRewardPercent: number): number => {
//   const commissions = validators
//     .map((validator) => validator.commission)
//     .filter((commission) => commission < IGNORED_COMMISSION_THRESHOLD)
//     .sort();
//
//   const length = commissions.length;
//   const median = (commissions[(length - 1) >> 1] + commissions[length >> 1]) / 2;
//
//   return avgValidatorRewardPercent * (1 - median);
// };
//
// const getApyFor = (accountId: AccountID) => {
//   return apyByValidator()[accountId] || expectedAPY();
// };
//
// const calculateReturns = (
//   amount: BN,
//   days: number,
//   isCompound: boolean,
// ): { gainAmount: number; gainFraction: number } => {
//   const dailyPercent = maxAPY()
//     .addn(1)
//     .pow(new BN(1 / DAYS_IN_YEAR))
//     .subn(1);
//
//   return calculateReward(amount.toNumber(), days, dailyPercent.toNumber(), isCompound);
// };

// TODO: Rewards section

// const calculateReward = (
//   amount: number,
//   days: number,
//   dailyPercent: number,
//   isCompound: boolean,
// ): { gainAmount: number; gainFraction: number } => {
//   const gainPercent = isCompound
//     ? calculateCompoundPercent(days, dailyPercent)
//     : calculateSimplePercent(days, dailyPercent);
//
//   return {
//     gainAmount: gainPercent * amount,
//     gainFraction: gainPercent,
//   };
// };
//
// const calculateCompoundPercent = (days: number, dailyPercent: number): number => {
//   return Math.pow(1 + dailyPercent, days) - 1;
// };
//
// const calculateSimplePercent = (days: number, dailyPercent: number): number => {
//   return dailyPercent * days;
// };
