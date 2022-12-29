import { ApiPromise } from '@polkadot/api';
import { u8aToString } from '@polkadot/util';
import merge from 'lodash/merge';

import { getValidatorsApy } from './apyCalculator';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { Identity, SubIdentity, Validator, ValidatorMap, IValidatorsService } from './common/types';

export const useValidators = (): IValidatorsService => {
  const getValidators = async (chainId: ChainId, api: ApiPromise, era: number): Promise<ValidatorMap> => {
    const [stake, prefs] = await Promise.all([getValidatorsStake(api, era), getValidatorsPrefs(api, era)]);

    const mergedValidators = merge(stake, prefs);

    const [apy, identity] = await Promise.all([
      getIdentities(api, Object.keys(mergedValidators)),
      getApy(api, Object.values(mergedValidators)),
    ]);

    return merge(mergedValidators, apy, identity);
  };

  const getValidatorsStake = async (api: ApiPromise, era: number): Promise<ValidatorMap> => {
    const data = await api.query.staking.erasStakersClipped.entries(era);

    return data.reduce((acc, [storageKey, type]) => {
      const address = storageKey.args[1].toString();
      const totalStake = type.total.toString();
      const payload = { totalStake, address, ownStake: type.own.toString() };

      return { ...acc, [address]: payload };
    }, {});
  };

  const getValidatorsPrefs = async (api: ApiPromise, era: number): Promise<ValidatorMap> => {
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

  const getIdentities = async (api: ApiPromise, addresses: AccountID[]): Promise<Record<AccountID, Identity>> => {
    const subIdentities = await getSubIdentities(api, addresses);
    const parentIdentities = await getParentIdentities(api, subIdentities);

    return addresses.reduce((acc, address) => {
      return { ...acc, [address]: { identity: parentIdentities[address] } };
    }, {});
  };

  const getSubIdentities = async (api: ApiPromise, addresses: AccountID[]): Promise<SubIdentity[]> => {
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
  ): Promise<Record<AccountID, Identity>> => {
    const identityAddresses = subIdentities.map((identity) => identity.parent);

    const parentIdentities = await api.query.identity.identityOf.multi(identityAddresses);

    return parentIdentities.reduce<Record<AccountID, Identity>>((acc, identity, index) => {
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

  const getApy = async (api: ApiPromise, validators: Validator[]): Promise<Record<AccountID, { apy: number }>> => {
    const apy = await getValidatorsApy(api, validators);

    return Object.entries(apy).reduce((acc, [address, apy]) => {
      return { ...acc, [address]: { apy } };
    }, {});
  };

  const getNominators = async (api: ApiPromise, account: AccountID): Promise<string[]> => {
    try {
      const data = await api?.query.staking.nominators(account);
      if (data.isNone) return [];
      const unwrappedData = data.unwrap();

      return unwrappedData.targets.toArray().map((nominator) => nominator.toString());
    } catch (error) {
      console.warn(error);

      return [];
    }
  };

  return {
    getValidators,
    getMaxValidators,
    getNominators,
  };
};
