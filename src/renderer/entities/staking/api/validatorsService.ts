import { type ApiPromise } from '@polkadot/api';
import { type Data, type Option } from '@polkadot/types';
import { type AccountId32 } from '@polkadot/types/interfaces';
import { type PalletIdentityRegistration } from '@polkadot/types/lookup';
import { u8aToString } from '@polkadot/util';
import merge from 'lodash/merge';

import { type Address, type EraIndex, type Identity, type SubIdentity, type Validator } from '@/shared/core';
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

  const [identity, slashes] = await Promise.all([
    getIdentities(api, Object.keys(mergedValidators), isLightClient),
    getSlashingSpans(api, Object.keys(stake), era, isLightClient),
    // getApy(api, Object.values(mergedValidators)),
  ]);

  return merge(mergedValidators, identity, slashes);
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

// TODO: Temporary turn off identities
async function getIdentities(
  api: ApiPromise,
  addresses: Address[],
  isLightClient?: boolean,
): Promise<Record<Address, { identity: Identity }>> {
  return Promise.resolve({});

  const subIdentities = await getSubIdentities(api, addresses, isLightClient);
  const parentIdentities = await getParentIdentities(api, subIdentities, isLightClient);

  return addresses.reduce<Record<Address, { identity: Identity }>>((acc, address) => {
    acc[address] = { identity: parentIdentities[address] };

    return acc;
  }, {});
}

async function getSubIdentities(
  api: ApiPromise,
  addresses: Address[],
  isLightClient?: boolean,
): Promise<SubIdentity[]> {
  if (isLightClient) {
    const wrappedIdentities = await api.query.identity.superOf.entries();

    const subIdentities = wrappedIdentities.reduce<Record<Address, [AccountId32, Data]>>(
      (acc, [storageKey, wrappedIdentity]) => {
        acc[storageKey.args[0].toString()] = wrappedIdentity.unwrap();

        return acc;
      },
      {},
    );

    return addresses.reduce<SubIdentity[]>((acc, subAddress) => {
      const payload = {
        sub: subAddress,
        parent: subAddress,
        subName: '',
      };

      if (subIdentities[subAddress]) {
        const rawData = subIdentities[subAddress];
        payload.parent = rawData[0].toHuman();
        payload.subName = rawData[1].isRaw ? u8aToString(rawData[1].asRaw) : rawData[1].value.toString();
      }

      acc.push(payload);

      return acc;
    }, []);
  }

  const subIdentities = await api.query.identity.superOf.multi(addresses);

  return subIdentities.reduce<SubIdentity[]>((acc, identity, index) => {
    const payload = {
      sub: addresses[index],
      parent: addresses[index],
      subName: '',
    };

    if (identity.isSome) {
      const [address, rawData] = identity.unwrap();
      payload.parent = address.toHuman();
      payload.subName = rawData.isRaw ? u8aToString(rawData.asRaw) : rawData.value.toString();
    }

    acc.push(payload);

    return acc;
  }, []);
}

async function getParentIdentities(
  api: ApiPromise,
  subIdentities: SubIdentity[],
  isLightClient?: boolean,
): Promise<Record<Address, Identity>> {
  let parentIdentities;

  if (isLightClient) {
    const wrappedIdentities = await api.query.identity.identityOf.entries();

    const identities = wrappedIdentities.reduce<Record<Address, Option<PalletIdentityRegistration>>>(
      (acc, [storageKey, identity]) => {
        const address = storageKey.args[0].toString();
        // @ts-expect-error TODO fix
        acc[address] = identity;

        return acc;
      },
      {},
    );

    parentIdentities = subIdentities.map((identity) => identities[identity.parent]);
  } else {
    const identityAddresses = subIdentities.map((identity) => identity.parent);
    parentIdentities = await api.query.identity.identityOf.multi(identityAddresses);
  }

  return parentIdentities.reduce<Record<Address, Identity>>((acc, identity, index) => {
    if (!identity || identity.isNone) return acc;

    const { parent, sub, subName } = subIdentities[index];
    const unwrappedIdentity = identity.unwrap();
    // HINT: in runtime 1_4_0 unwrappedIdentity returns Option<(identity, rest)>
    const data = 'info' in unwrappedIdentity ? unwrappedIdentity : unwrappedIdentity[0];
    const { display, web, email, twitter } = data.info; // { data also includes: judgements, deposit }

    acc[sub] = {
      subName,
      email: email.isRaw ? u8aToString(email.asRaw) : email.value.toString(),
      twitter: twitter.isRaw ? u8aToString(twitter.asRaw) : twitter.value.toString(),
      website: web.isRaw ? u8aToString(web.asRaw) : web.value.toString(),
      parent: {
        address: parent,
        name: display.isRaw ? u8aToString(display.asRaw) : display.value.toString(),
      },
    };

    return acc;
  }, {});
}

// Don't show APY in UI right now
// async function getApy(api: ApiPromise, validators: Validator[]): Promise<Record<Address, { apy: number }>> {
//   const apy = await getValidatorsApy(api, validators);
//
//   return Object.entries(apy).reduce((acc, [address, apy]) => {
//     return { ...acc, [address]: { apy } };
//   }, {});
// }

async function getNominators(api: ApiPromise, stash: Address, isLightClient?: boolean): Promise<ValidatorMap> {
  try {
    const data = await api.query.staking.nominators(stash);

    if (data.isNone) return {};

    const nominatorsUnwraped = data.unwrap();

    const nominators = nominatorsUnwraped.targets.toArray().reduce<ValidatorMap>((acc, nominator) => {
      const address = nominator.toString();
      acc[address] = { address } as Validator;

      return acc;
    }, {});

    const identities = await getIdentities(api, Object.keys(nominators), isLightClient);

    return merge(nominators, identities);
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
