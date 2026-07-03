import { type ApiPromise } from '@polkadot/api';
import { default as BigNumber } from 'bignumber.js';
import { merge } from 'lodash';

import { type Chain, type EraIndex, type Validator } from '@/shared/core';
import { keys, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  AssetHubChains,
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

const MILLISECONDS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const DEFAULT_ERA_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Era duration fallback (ms), used when the relay-chain Babe consts are not yet
 * available (e.g. the relay api hasn't connected). Keeps APY visible without
 * making the dashboard depend on the relay connection.
 */
const FALLBACK_ERA_DURATION_MS: Record<string, number> = {
  [AssetHubChains.POLKADOT_AH]: 24 * 60 * 60 * 1000, // 24h
  [AssetHubChains.KUSAMA_AH]: 6 * 60 * 60 * 1000, // 6h
  [AssetHubChains.WESTEND_AH]: 6 * 60 * 60 * 1000, // 6h
};

type IssuancePredictionCall = () => Promise<{ toJSON: () => unknown }>;

function hasKey<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
  return typeof value === 'object' && value !== null && key in value;
}

/**
 * Era duration in milliseconds.
 *
 * Asset Hub is a parachain and has no Babe pallet, so the era length is derived
 * from the relay chain: `sessionsPerEra (Asset Hub) × epochDuration × blockTime
 * (relay)`. The relay block time (≈6s) must be used here — using the Asset Hub
 * block time (≈12s) would double the era length and halve the resulting APY.
 */
function getEraDurationMs(api: ApiPromise, timelineApi: ApiPromise, chain: Chain): number {
  try {
    const { babe } = timelineApi.consts;
    if (babe?.epochDuration && babe?.expectedBlockTime) {
      const sessionsPerEra = api.consts.staking.sessionsPerEra.toNumber();
      const eraDuration = sessionsPerEra * babe.epochDuration.toNumber() * babe.expectedBlockTime.toNumber();
      if (eraDuration > 0) return eraDuration;
    }
  } catch (error) {
    console.warn('Unable to derive era duration from relay chain', error);
  }

  return FALLBACK_ERA_DURATION_MS[chain.chainId] ?? DEFAULT_ERA_DURATION_MS;
}

function parsePlanck(value: unknown): BigNumber | null {
  if (typeof value === 'number') return new BigNumber(value);
  if (typeof value === 'string') {
    const parsed = value.startsWith('0x') ? new BigNumber(value.slice(2), 16) : new BigNumber(value);

    return parsed.isFinite() ? parsed : null;
  }

  return null;
}

// Reads `nextMint = [toStakers, toTreasury]` from the inflation prediction result.
function readStakersMint(json: unknown): BigNumber | null {
  if (!hasKey(json, 'nextMint')) return null;

  const { nextMint } = json;
  if (!Array.isArray(nextMint) || nextMint.length === 0) return null;

  return parsePlanck(nextMint[0]);
}

// Resolves the `inflation.experimentalIssuancePredictionInfo` runtime call if the chain exposes it.
function getIssuancePredictionCall(api: ApiPromise): IssuancePredictionCall | null {
  if (!hasKey(api.call, 'inflation')) return null;

  const { inflation } = api.call;
  if (!hasKey(inflation, 'experimentalIssuancePredictionInfo')) return null;

  const predict = inflation.experimentalIssuancePredictionInfo;

  // The signature cannot be inferred from the dynamically-typed runtime api.
  return typeof predict === 'function' ? (predict as IssuancePredictionCall) : null;
}

/**
 * Per-era reward minted to stakers (validators + nominators), before
 * commission.
 *
 * Uses the `inflation.experimentalIssuancePredictionInfo` runtime API, which
 * the runtime documents as the recommended source over re-deriving the onchain
 * logic and which reflects the chain's real inflation model (fixed on Polkadot,
 * curve-based on Kusama). Falls back to the last completed era's realized
 * payout when the runtime API is unavailable.
 */
async function getStakersEraReward(api: ApiPromise, era: EraIndex): Promise<BigNumber | null> {
  const predict = getIssuancePredictionCall(api);

  if (predict) {
    try {
      const info = await predict();
      const toStakers = readStakersMint(info.toJSON());
      if (toStakers && toStakers.isGreaterThan(0)) return toStakers;
    } catch (error) {
      console.warn('inflation prediction API failed, falling back to era reward', error);
    }
  }

  try {
    const reward = await api.query.staking.erasValidatorReward(Math.max(era - 1, 0));
    if (reward.isSome) return new BigNumber(reward.unwrap().toString());
  } catch (error) {
    console.warn(error);
  }

  return null;
}

type NetworkApyParams = {
  api: ApiPromise;
  timelineApi: ApiPromise;
  chain: Chain;
  era: EraIndex;
  validators: ApyValidator[];
};

/**
 * Network average staking APY shown on the dashboard.
 *
 * Computed from the chain's actual per-era staker reward, annualised over the
 * era length (`reward × erasPerYear / totalStaked`) and reduced by the median
 * validator commission. This is correct for both the legacy NPoS inflation
 * curve (Kusama) and the fixed inflation model (Polkadot, ref. 1139) — unlike
 * re-deriving the curve, which over-states Polkadot APY by ~2.7×.
 */
export const getNetworkApy = async (params: NetworkApyParams): Promise<string | null> => {
  const { api, timelineApi, chain, era, validators } = params;

  const stakersEraReward = await getStakersEraReward(api, era);
  if (!stakersEraReward) return null;

  const totalStaked = new BigNumber((await api.query.staking.erasTotalStake(era)).toString());
  if (totalStaked.isZero()) return null;

  const erasPerYear = MILLISECONDS_PER_YEAR / getEraDurationMs(api, timelineApi, chain);

  const grossApr = stakersEraReward.multipliedBy(erasPerYear).div(totalStaked);
  const median = getMedianCommission(validators);

  return grossApr
    .multipliedBy(1 - median / 100)
    .multipliedBy(100)
    .toFixed(2);
};
