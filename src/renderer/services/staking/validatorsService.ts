import { ApiPromise } from '@polkadot/api';
import { u8aToString } from '@polkadot/util';
import merge from 'lodash/merge';
import { Data, Option } from '@polkadot/types';
import { PalletIdentityRegistration } from '@polkadot/types/lookup';
import { AccountId32 } from '@polkadot/types/interfaces';

import { Identity, SubIdentity } from '@renderer/domain/identity';
import { Address, ChainId, EraIndex } from '@renderer/domain/shared-kernel';
import { Validator } from '@renderer/domain/validator';
import { getValidatorsApy } from './apyCalculator';
import { IValidatorsService, ValidatorMap } from './common/types';

export const useValidators = (): IValidatorsService => {
  const getValidators = async (chainId: ChainId, api: ApiPromise, era: EraIndex): Promise<ValidatorMap> => {
    const [stake, prefs] = await Promise.all([getValidatorsStake(api, era), getValidatorsPrefs(api, era)]);

    const mergedValidators = merge(stake, prefs);

    const [identity, apy, slashes] = await Promise.all([
      getIdentities(api, Object.keys(mergedValidators)),
      getApy(api, Object.values(mergedValidators)),
      getSlashingSpans(api, Object.keys(stake), era),
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

  const getIdentities = async (api: ApiPromise, addresses: Address[]): Promise<Record<Address, Identity>> => {
    const subIdentities = await getSubIdentities(api, addresses);
    const parentIdentities = await getParentIdentities(api, subIdentities);

    return addresses.reduce((acc, address) => {
      return { ...acc, [address]: { identity: parentIdentities[address] } };
    }, {});
  };

  const getSubIdentities = async (api: ApiPromise, addresses: Address[]): Promise<SubIdentity[]> => {
    const wrappedIdentities = await api.query.identity.superOf.entries();

    const subIdentities = wrappedIdentities.reduce<Record<Address, [AccountId32, Data]>>(
      (acc, [storageKey, wrappedIdentity]) => {
        const identity = wrappedIdentity.unwrap();

        acc[storageKey.args[0].toString()] = identity;

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
  };

  const getParentIdentities = async (
    api: ApiPromise,
    subIdentities: SubIdentity[],
  ): Promise<Record<Address, Identity>> => {
    const identityAddresses = subIdentities.map((identity) => identity.parent);

    const wrappedIdentities = await api.query.identity.identityOf.entries();

    const parentIdentities = wrappedIdentities.filter(([accountId]) =>
      identityAddresses.includes(accountId.args[0].toString()),
    );

    return parentIdentities.reduce<Record<Address, Identity>>((acc, wrappedIdentity, index) => {
      const identity = wrappedIdentity[1] as Option<PalletIdentityRegistration>;
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

  const getNominators = async (api: ApiPromise, stash: Address): Promise<ValidatorMap> => {
    try {
      const data = await api.query.staking.nominators(stash);
      if (data.isNone) return {};

      const nominators = data
        .unwrap()
        .targets.toArray()
        .reduce<ValidatorMap>((acc, nominator) => {
          const address = nominator.toString();
          acc[address] = { address } as Validator;

          return acc;
        }, {});

      const identities = await getIdentities(api, Object.keys(nominators));

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
  ): Promise<Record<Address, { slashed: boolean }>> => {
    const slashDeferDuration = getSlashDeferDuration(api);
    const slashingSpans = await api.query.staking.slashingSpans.multi(addresses);

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
    getMaxValidators,
    getNominators,
  };
};
