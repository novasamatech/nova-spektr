import { type ApiPromise } from '@polkadot/api';
import { default as BigNumber } from 'bignumber.js';
import { merge } from 'lodash';

import { type EraIndex, type Validator } from '@/shared/core';
import { keys, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  DECAY_RATE,
  DEFAULT_MAX_NOMINATORS,
  INTEREST_IDEAL,
  KUSAMA_MAX_NOMINATORS,
  MINIMUM_INFLATION,
  STAKED_PORTION_IDEAL,
} from '../constants';
import { type ApyValidator, type ValidatorMap } from '../types';

function isKusamaChainId(chainId: string): boolean {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
}

export const validatorsService = {
  getValidatorsWithInfo,
  getValidatorsList,
  getMaxValidators,
  getNominators,
};

async function getValidatorsList(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const [stake, prefs] = await Promise.all([getValidatorFunction(api)(era), getValidatorsPrefs(api, era)]);

  return merge(stake, prefs) as ValidatorMap;
}

async function getValidatorsWithInfo(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const [stake, prefs] = await Promise.all([getValidatorFunction(api)(era), getValidatorsPrefs(api, era)]);

  const mergedValidators = merge(stake, prefs);

  try {
    const slashes = await getSlashingSpans(api, keys(stake), era);

    return merge(mergedValidators, slashes) as ValidatorMap;
  } catch {
    return mergedValidators as ValidatorMap;
  }
}

function getValidatorFunction(api: ApiPromise) {
  return isOldRuntimeForValidators(api)
    ? (era: EraIndex) => getValidatorsStake_OLD(api, era)
    : (era: EraIndex) => getValidatorsStake(api, era);
}

/**
 * Gets Validators information including nominators that will receive rewards
 * (runtime pre1_4_0)
 *
 * @deprecated Will become deprecated after runtime upgrade for DOT/KSM
 */
async function getValidatorsStake_OLD(api: ApiPromise, era: EraIndex): Promise<Record<AccountId, ValidatorStake>> {
  const data = await api.query.staking.erasStakersClipped.entries(era);
  const maxNominatorRewarded = getMaxNominatorRewarded(api);

  return data.reduce<Record<AccountId, ValidatorStake>>((acc, [storageKey, type]) => {
    const accountId = toAccountId(storageKey.args[1].toString());
    const nominators = type.others.map(n => ({
      who: toAccountId(n.who.toString()),
      value: n.value.toString(),
    }));

    acc[accountId] = {
      accountId,
      nominators,
      totalStake: type.total.toString(),
      oversubscribed: type.others.length >= maxNominatorRewarded,
      ownStake: type.own.toString(),
    };

    return acc;
  }, {});
}

type ValidatorStake = Pick<Validator, 'accountId' | 'totalStake' | 'oversubscribed' | 'ownStake' | 'nominators'>;
type ValidatorPrefs = Pick<Validator, 'accountId' | 'commission' | 'blocked'>;

async function getValidatorsStake(api: ApiPromise, era: EraIndex): Promise<Record<AccountId, ValidatorStake>> {
  const data = await api.query.staking.erasStakersOverview.entries(era);

  return data.reduce<Record<AccountId, ValidatorStake>>((acc, [storageKey, type]) => {
    const accountId = toAccountId(storageKey.args[1].toString());

    acc[accountId] = {
      accountId,
      totalStake: type.value.total.toString(),
      oversubscribed: false,
      ownStake: type.value.own.toString(),
      nominators: [],
    };

    return acc;
  }, {});
}

async function getValidatorsPrefs(api: ApiPromise, era: EraIndex): Promise<Record<AccountId, ValidatorPrefs>> {
  const data = await api.query.staking.erasValidatorPrefs.entries(era);

  return data.reduce<Record<AccountId, ValidatorPrefs>>((acc, [storageKey, type]) => {
    const accountId = toAccountId(storageKey.args[1].toString());

    acc[accountId] = {
      accountId,
      commission: parseFloat(String(type.commission.toHuman())),
      blocked: type.blocked.toHuman() as boolean,
    };

    return acc;
  }, {});
}

function getDefaultValidatorsAmount(api: ApiPromise): number {
  if (isKusamaChainId(api.genesisHash.toHex())) return KUSAMA_MAX_NOMINATORS;

  return DEFAULT_MAX_NOMINATORS;
}

function getMaxValidators(api: ApiPromise): number {
  if (api.consts.staking.maxNominations) {
    // @ts-expect-error TODO fix
    return api.consts.staking.maxNominations.toNumber();
  }

  return getDefaultValidatorsAmount(api);
}

async function getNominators(api: ApiPromise, stash: AccountId): Promise<ValidatorMap> {
  try {
    const data = await api.query.staking.nominators(stash);

    if (data.isNone) return {};

    const nominatorsUnwraped = data.unwrap();
    const result: Record<AccountId, Pick<Validator, 'accountId'>> = {};

    for (const nominator of nominatorsUnwraped.targets.toArray()) {
      const accountId = toAccountId(nominator.toString());
      result[accountId] = { accountId };
    }

    return result as ValidatorMap;
  } catch (error) {
    console.warn(error);

    return {};
  }
}

// TODO: remove after DOT/KSM updates their runtime
function isOldRuntimeForValidators(api: ApiPromise): boolean {
  return Boolean(api.consts.staking.maxNominatorRewardedPerValidator);
}

function getMaxNominatorRewarded(api: ApiPromise): number {
  // @ts-expect-error TODO fix
  return api.consts.staking.maxNominatorRewardedPerValidator.toNumber();
}

async function getSlashingSpans(
  api: ApiPromise,
  accounts: AccountId[],
  era: EraIndex,
): Promise<Record<AccountId, { slashed: boolean }>> {
  const unappliedSlashes = await api.query.staking.unappliedSlashes(era);

  if (!unappliedSlashes.length) {
    return Object.fromEntries(accounts.map(account => [account, { slashed: false }]));
  }

  const slashedSet = new Set(unappliedSlashes.map(slash => toAccountId(slash.validator.toString())));

  return Object.fromEntries(accounts.map(account => [account, { slashed: slashedSet.has(account) }]));
}

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
): Record<AccountId, number> => {
  const avgStake = totalStaked.div(validators.length);

  return validators.reduce((acc, validator) => {
    const validatorApy = calculateValidatorApy(validator, avgRewardPercent, avgStake);

    return { ...acc, [validator.accountId]: validatorApy };
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
    .map(validator => validator.commission)
    .filter(commission => commission && commission < 100)
    .sort((a, b) => a - b);

  if (!profitable.length) {
    return 0;
  }

  return (profitable[(profitable.length - 1) >> 1]! + profitable[profitable.length >> 1]!) / 2;
};

/**
 * Get APY for list of validators
 *
 * @param api ApiPromise to make RPC calls
 * @param validators List of validators
 *
 * @returns {Promise}
 */
export const getValidatorsApy = async (api: ApiPromise, validators: ApyValidator[]) => {
  const totalIssuance = await getTotalIssuance(api);
  const totalStaked = validators.reduce((acc, { totalStake }) => {
    return acc.plus(new BigNumber(totalStake));
  }, new BigNumber(0));

  const avgRewardPercent = getAvgRewardPercent(totalStaked, totalIssuance);

  return getApyForValidators(totalStaked, avgRewardPercent, validators);
};

/**
 * Get average APY
 *
 * @param api ApiPromise to make RPC calls
 * @param validators Array of calculated APYs'
 *
 * @returns {Promise}
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
