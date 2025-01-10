import { type ApiPromise } from '@polkadot/api';
import merge from 'lodash/merge';

import { type Address, type EraIndex, type Validator } from '@/shared/core';
import { DEFAULT_MAX_NOMINATORS, KUSAMA_MAX_NOMINATORS } from '../lib/constants';
import { stakingUtils } from '../lib/staking-utils';
import { type ValidatorMap } from '../lib/types';

export const validatorsService = {
  getValidatorsWithInfo,
  getValidatorsList,
  getMaxValidators,
  getNominators,
};

/**
 * Get simple validators list
 */
async function getValidatorsList(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  const [stake, prefs] = await Promise.all([getValidatorFunction(api)(era), getValidatorsPrefs(api, era)]);

  return merge(stake, prefs);
}

/**
 * Get validators with identity, apy and slashing spans
 */
async function getValidatorsWithInfo(api: ApiPromise, era: EraIndex, isLightClient?: boolean): Promise<ValidatorMap> {
  const [stake, prefs] = await Promise.all([getValidatorFunction(api)(era), getValidatorsPrefs(api, era)]);

  const mergedValidators = merge(stake, prefs);

  const slashes = await getSlashingSpans(api, Object.keys(stake), era, isLightClient);

  return merge(mergedValidators, slashes);
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
async function getValidatorsStake_OLD(api: ApiPromise, era: EraIndex): Promise<ValidatorMap> {
  // HINT: uncomment if we need full list of nominators (even those who doesn't get rewards)
  // const data = await api.query.staking.erasStakers.entries(era);
  const data = await api.query.staking.erasStakersClipped.entries(era);
  const maxNominatorRewarded = getMaxNominatorRewarded(api);

  return data.reduce<ValidatorMap>((acc, [storageKey, type]) => {
    const address = storageKey.args[1].toString();
    const nominators = type.others.map((n) => ({ who: n.who.toString(), value: n.value.toString() }));

    acc[address] = {
      address,
      nominators,
      totalStake: type.total.toString(),
      oversubscribed: type.others.length >= maxNominatorRewarded,
      ownStake: type.own.toString(),
    } as Validator;

    return acc;
  }, {});
}

type ValidatorStake = Pick<Validator, 'address' | 'totalStake' | 'oversubscribed' | 'ownStake' | 'nominators'>;

async function getValidatorsStake(api: ApiPromise, era: EraIndex): Promise<Record<Address, ValidatorStake>> {
  // HINT: to get full list of nominators uncomment code below to paginate for each validator
  const data = await api.query.staking.erasStakersOverview.entries(era);

  return data.reduce<Record<Address, ValidatorStake>>((acc, [storageKey, type]) => {
    const address = storageKey.args[1].toString();

    // const pageCount = type.value.pageCount.toNumber();
    // const pagedRequests = Array.from({ length: pageCount }, (_, index) => [era, address, index]);
    // acc.requests.push(api.query.staking.erasStakersPaged.multi(pagedRequests));

    acc[address] = {
      address,
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
    const address = storageKey.args[1].toString();

    acc[address] = {
      address,
      commission: parseFloat(type.commission.toHuman() as string),
      blocked: type.blocked.toHuman(),
    } as Validator;

    return acc;
  }, {});
}

function getDefaultValidatorsAmount(api: ApiPromise): number {
  if (stakingUtils.isKusamaChainId(api.genesisHash.toHex())) return KUSAMA_MAX_NOMINATORS;

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

async function getNominators(api: ApiPromise, stash: Address): Promise<ValidatorMap> {
  try {
    const data = await api.query.staking.nominators(stash);

    if (data.isNone) return {};

    const nominatorsUnwraped = data.unwrap();

    return nominatorsUnwraped.targets.toArray().reduce<ValidatorMap>((acc, nominator) => {
      const address = nominator.toString();
      acc[address] = { address } as Validator;

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

function getSlashDeferDuration(api: ApiPromise): number {
  return api.consts.staking.slashDeferDuration.toNumber();
}

async function getSlashingSpans(
  api: ApiPromise,
  addresses: Address[],
  era: EraIndex,
  isLightClient?: boolean,
): Promise<Record<Address, { slashed: boolean }>> {
  const slashDeferDuration = getSlashDeferDuration(api);
  let slashingSpans;

  if (isLightClient) {
    const slashingSpansWrapped = await api.query.staking.slashingSpans.entries();
    slashingSpans = slashingSpansWrapped
      .filter(([storageKey]) => addresses.includes(storageKey.args[0].toString()))
      .map((spanWrapped) => spanWrapped[1]);
  } else {
    slashingSpans = await api.query.staking.slashingSpans.multi(addresses);
  }

  return slashingSpans.reduce<Record<Address, { slashed: boolean }>>((acc, span, index) => {
    let validatorIsSlashed = false;
    if (span.isSome) {
      validatorIsSlashed = era - span.unwrap().lastNonzeroSlash.toNumber() < slashDeferDuration;
    }

    acc[addresses[index]] = { slashed: validatorIsSlashed };

    return acc;
  }, {});
}
