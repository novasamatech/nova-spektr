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
} from '../_lib/constants';
import { type ApyValidator, type ValidatorMap } from '../_lib/types';

function isKusamaChainId(chainId: string): boolean {
  return chainId === '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
}

// =====================================================
// ============== validatorsService ====================
// =====================================================

export const validatorsService = {
  getValidatorsWithInfo,
  getValidatorsList,
  getMaxValidators,
  getNominators,
};

async function getValidatorsList(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const [stake, prefs] = await Promise.all([getValidatorFunction(api)(era), getValidatorsPrefs(api, era)]);

  return merge(stake, prefs);
}

async function getValidatorsWithInfo(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const [stake, prefs] = await Promise.all([getValidatorFunction(api)(era), getValidatorsPrefs(api, era)]);

  const mergedValidators = merge(stake, prefs);

  try {
    const slashes = await getSlashingSpans(api, keys(stake), era);

    return merge(mergedValidators, slashes);
  } catch {
    return mergedValidators;
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
  // HINT: uncomment if we need full list of nominators (even those who doesn't get rewards)
  // const data = await api.query.staking.erasStakers.entries(era);
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

async function getValidatorsStake(api: ApiPromise, era: EraIndex): Promise<Record<AccountId, ValidatorStake>> {
  // HINT: to get full list of nominators uncomment code below to paginate for each validator
  const data = await api.query.staking.erasStakersOverview.entries(era);

  return data.reduce<Record<AccountId, ValidatorStake>>((acc, [storageKey, type]) => {
    const accountId = toAccountId(storageKey.args[1].toString());

    // const pageCount = type.value.pageCount.toNumber();
    // const pagedRequests = Array.from({ length: pageCount }, (_, index) => [era, address, index]);
    // acc.requests.push(api.query.staking.erasStakersPaged.multi(pagedRequests));

    acc[accountId] = {
      accountId,
      totalStake: type.value.total.toString(),
      oversubscribed: false,
      ownStake: type.value.own.toString(),
      nominators: [],
    };

    return acc;
  }, {});

  // const nominatorsPages = await Promise.all(requests);
  // return stakes.reduce<Record<Address, ValidatorStake>>((acc, stake, index) => {
  //   const nominators = nominatorsPages[index].flatMap((pages) => {
  //     return pages.value.others.map((page: any) => ({ who: page.who.toString(), value: page.value.toString() }));
  //   });
  //
  //   acc[stake.address] = { ...stake, nominators };
  //
  //   return acc;
  // }, {});
}

async function getValidatorsPrefs(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const data = await api.query.staking.erasValidatorPrefs.entries(era);

  return data.reduce<ValidatorMap>((acc, [storageKey, type]) => {
    const accountId = toAccountId(storageKey.args[1].toString());

    acc[accountId] = {
      accountId,
      commission: parseFloat(type.commission.toHuman() as string),
      blocked: type.blocked.toHuman(),
    } as Validator;

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

// Don't show APY in UI right now
// async function getApy(api: ApiPromise, validators: Validator[]): Promise<Record<Address, { apy: number }>> {
//   const apy = await getValidatorsApy(api, validators);
//
//   return Object.entries(apy).reduce((acc, [address, apy]) => {
//     return { ...acc, [address]: { apy } };
//   }, {});
// }

async function getNominators(api: ApiPromise, stash: AccountId): Promise<ValidatorMap> {
  try {
    const data = await api.query.staking.nominators(stash);

    if (data.isNone) return {};

    const nominatorsUnwraped = data.unwrap();

    return nominatorsUnwraped.targets.toArray().reduce<ValidatorMap>((acc, nominator) => {
      const accountId = toAccountId(nominator.toString());
      acc[accountId] = { accountId } as Validator;

      return acc;
    }, {});
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

// =====================================================
// ================ APY Calculator =====================
// =====================================================

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
