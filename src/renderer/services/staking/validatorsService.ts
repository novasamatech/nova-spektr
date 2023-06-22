import merge from 'lodash/merge';
import { ApiPromise } from '@polkadot/api';
import { u8aToString } from '@polkadot/util';
import { Data } from '@polkadot/types';
import { PalletIdentityRegistration } from '@polkadot/types/lookup';
import { AccountId32 } from '@polkadot/types/interfaces';
import { Option } from '@polkadot/types';

import { Identity, SubIdentity } from '@renderer/domain/identity';
import { Address, ChainId, EraIndex } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { getValidatorsApy } from './apyCalculator';
import { IValidatorsService, ValidatorMap } from './common/types';

export const useValidators = (): IValidatorsService => {
  const getValidatorsList = async (api: ApiPromise, era: EraIndex): Promise<ValidatorMap> => {
    const [stake, prefs] = await Promise.all([getValidatorsStake(api, era), getValidatorsPrefs(api, era)]);

    return merge(stake, prefs);
  };

  const getValidators = async (
    chainId: ChainId,
    api: ApiPromise,
    era: EraIndex,
    isLightClient?: boolean,
  ): Promise<ValidatorMap> => {
    const [stake, prefs] = await Promise.all([getValidatorsStake(api, era), getValidatorsPrefs(api, era)]);

    const mergedValidators = merge(stake, prefs);

    const [identity, apy, slashes] = await Promise.all([
      getIdentities(api, Object.keys(mergedValidators), isLightClient),
      getApy(api, Object.values(mergedValidators)),
      getSlashingSpans(api, Object.keys(stake), era, isLightClient),
    ]);

    return merge(mergedValidators, apy, identity, slashes);
  };

  const getValidatorsStake = async (api: ApiPromise, era: EraIndex): Promise<ValidatorMap> => {
    // TODO: uncomment if we need full lit of nominators (even those who doesn't get rewards)
    // const data = await api.query.staking.erasStakers.entries(era);
    const data = await api.query.staking.erasStakersClipped.entries(era);
    const maxNominatorRewarded = getMaxNominatorRewarded(api);

    return data.reduce((acc, [storageKey, type]) => {
      const address = storageKey.args[1].toString();
      const totalStake = type.total.toString();
      const oversubscribed = type.others.length >= maxNominatorRewarded;
      const nominators = type.others.map((n) => ({ who: n.who.toString(), value: n.value.toString() }));

      const payload = { totalStake, address, oversubscribed, nominators, ownStake: type.own.toString() };

      return { ...acc, [address]: payload };
    }, {});
  };

  const getValidatorsPrefs = async (api: ApiPromise, era: EraIndex): Promise<ValidatorMap> => {
    const data = await api.query.staking.erasValidatorPrefs.entries(era);

    return data.reduce((acc, [storageKey, type]) => {
      const address = storageKey.args[1].toString();
      const commission = parseFloat(type.commission.toHuman() as string);
      const payload = { address, commission, blocked: type.blocked.toHuman() };

      return { ...acc, [address]: payload };
    }, {});
  };

  const getMaxValidators = (api: ApiPromise): number => {
    return api.consts.staking.maxNominations.toNumber();
  };

  const getIdentities = async (
    api: ApiPromise,
    addresses: Address[],
    isLightClient?: boolean,
  ): Promise<Record<Address, Identity>> => {
    const subIdentities = await getSubIdentities(api, addresses, isLightClient);
    const parentIdentities = await getParentIdentities(api, subIdentities, isLightClient);

    return addresses.reduce((acc, address) => {
      return { ...acc, [address]: { identity: parentIdentities[address] } };
    }, {});
  };

  const getSubIdentities = async (
    api: ApiPromise,
    addresses: Address[],
    isLightClient?: boolean,
  ): Promise<SubIdentity[]> => {
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
        const payload = { sub: subAddress, parent: subAddress, subName: '' };

        if (subIdentities[subAddress]) {
          const rawData = subIdentities[subAddress];
          payload.parent = rawData[0].toHuman();
          payload.subName = rawData[1].isRaw ? u8aToString(rawData[1].asRaw) : rawData[1].value.toString();
        }

        return acc.concat(payload);
      }, []);
    }

    const subIdentities = await api.query.identity.superOf.multi(addresses);

    return subIdentities.reduce<SubIdentity[]>((acc, identity, index) => {
      const payload = { sub: addresses[index], parent: addresses[index], subName: '' };
      if (!identity.isNone) {
        const [address, rawData] = identity.unwrap();
        payload.parent = address.toHuman();
        payload.subName = rawData.isRaw ? u8aToString(rawData.asRaw) : rawData.value.toString();
      }

      return acc.concat(payload);
    }, []);
  };

  const getParentIdentities = async (
    api: ApiPromise,
    subIdentities: SubIdentity[],
    isLightClient?: boolean,
  ): Promise<Record<Address, Identity>> => {
    let parentIdentities;

    if (isLightClient) {
      const wrappedIdentities = await api.query.identity.identityOf.entries();

      const identities = wrappedIdentities.reduce<Record<Address, Option<PalletIdentityRegistration>>>(
        (acc, [storageKey, identity]) => {
          const address = storageKey.args[0].toString();

          return { ...acc, [address]: identity };
        },
        {},
      );

      parentIdentities = subIdentities.map((identity) => identities[identity.parent]);
    } else {
      const identityAddresses = subIdentities.map((identity) => identity.parent);
      parentIdentities = await api.query.identity.identityOf.multi(identityAddresses);
    }

    return parentIdentities.reduce<Record<Address, Identity>>((acc, identity, index) => {
      if (identity.isNone) return acc;

      const { parent, sub, subName } = subIdentities[index];
      const { info } = identity.unwrap(); // { judgements, info }
      const { display, web, riot, email, twitter } = info;

      const payload: Identity = {
        subName,
        email: email.isRaw ? u8aToString(email.asRaw) : email.value.toString(),
        riot: riot.isRaw ? u8aToString(riot.asRaw) : riot.value.toString(),
        twitter: twitter.isRaw ? u8aToString(twitter.asRaw) : twitter.value.toString(),
        website: web.isRaw ? u8aToString(web.asRaw) : web.value.toString(),
        parent: {
          address: parent,
          name: display.isRaw ? u8aToString(display.asRaw) : display.value.toString(),
        },
      };

      return { ...acc, [sub]: payload };
    }, {});
  };

  const getApy = async (api: ApiPromise, validators: Validator[]): Promise<Record<Address, { apy: number }>> => {
    const apy = await getValidatorsApy(api, validators);

    return Object.entries(apy).reduce((acc, [address, apy]) => {
      return { ...acc, [address]: { apy } };
    }, {});
  };

  const getNominators = async (api: ApiPromise, stash: Address, isLightClient?: boolean): Promise<ValidatorMap> => {
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
  };

  const getMaxNominatorRewarded = (api: ApiPromise): number => {
    return api.consts.staking.maxNominatorRewardedPerValidator.toNumber();
  };

  const getSlashDeferDuration = (api: ApiPromise): number => {
    return api.consts.staking.slashDeferDuration.toNumber();
  };

  const getSlashingSpans = async (
    api: ApiPromise,
    addresses: Address[],
    era: EraIndex,
    isLightClient?: boolean,
  ): Promise<Record<Address, { slashed: boolean }>> => {
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

    return slashingSpans.reduce((acc, span, index) => {
      let validatorIsSlashed = false;
      if (!span.isNone) {
        const { lastNonzeroSlash } = span.unwrap();
        validatorIsSlashed = era - lastNonzeroSlash.toNumber() < slashDeferDuration;
      }

      return { ...acc, [addresses[index]]: { slashed: validatorIsSlashed } };
    }, {});
  };

  return {
    getValidators,
    getValidatorsList,
    getMaxValidators,
    getNominators,
  };
};
