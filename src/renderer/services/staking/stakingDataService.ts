import { ApiPromise } from '@polkadot/api';
import { u8aToString } from '@polkadot/util';
import { useState } from 'react';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { getValidatorsApy } from '@renderer/services/staking/apyCalculator';
import {
  Identity,
  IStakingDataService,
  Staking,
  SubIdentity,
  Validator,
  ValidatorMap,
  StakingMap,
} from './common/types';

// TODO: divide into Validator service & Staking service (maybe even Era service)
export const useStakingData = (): IStakingDataService => {
  const [validators, setValidators] = useState<ValidatorMap>({});

  const subscribeActiveEra = (
    chainId: ChainId,
    api: ApiPromise,
    callback: (era: number) => void,
  ): Promise<() => void> => {
    return api.query.staking.activeEra((data: any) => {
      try {
        const unwrappedData = data.unwrap();
        callback(unwrappedData.get('index').toNumber());
      } catch (error) {
        console.warn(error);
        callback(0);
      }
    });
  };

  const subscribeStaking = async (
    chainId: ChainId,
    api: ApiPromise,
    accounts: AccountID[],
    callback: (staking: StakingMap) => void,
  ): Promise<() => void> => {
    const controllers = await getControllers(api, accounts);

    return listenToLedger(chainId, api, controllers, accounts, callback);
  };

  const getControllers = async (api: ApiPromise, accounts: AccountID[]): Promise<AccountID[]> => {
    try {
      const controllers = await api.query.staking.bonded.multi(accounts);

      return controllers.map((controller, index) =>
        controller.isNone ? accounts[index] : controller.unwrap().toString(),
      );
    } catch (error) {
      console.warn(error);

      return [];
    }
  };

  const listenToLedger = async (
    chainId: ChainId,
    api: ApiPromise,
    controllers: AccountID[],
    accounts: AccountID[],
    callback: (data: StakingMap) => void,
  ): Promise<() => void> => {
    return api.query.staking.ledger.multi(controllers, (data) => {
      try {
        const staking = data.reduce<StakingMap>((acc, ledger, index) => {
          const accountId = accounts[index];

          if (ledger.isNone) {
            return { ...acc, [accountId]: undefined };
          }

          const { active, stash, total, unlocking } = ledger.unwrap();

          const formattedUnlocking = unlocking.toArray().map((unlock) => ({
            value: unlock.value.toString(),
            era: unlock.era.toString(),
          }));

          const payload: Staking = {
            accountId,
            chainId,
            controller: controllers[index] || stash.toHuman(),
            stash: stash.toHuman(),
            active: active.toString(),
            total: total.toString(),
            unlocking: formattedUnlocking,
          };

          return { ...acc, [accountId]: payload };
        }, {});

        callback(staking);
      } catch (error) {
        console.warn(error);
        callback({});
      }
    });
  };

  const getValidators = async (chainId: ChainId, api: ApiPromise, era: number): Promise<void> => {
    const [totalStake, commission] = await Promise.all([setValidatorsStake(api, era), setValidatorsPrefs(api, era)]);

    const { addresses, apyPayload } = Object.entries(totalStake).reduce<Record<string, any[]>>(
      (acc, [address, totalStake]) => {
        acc.addresses.push(address);
        acc.apyPayload.push({ address, totalStake, commission: commission[address] });

        return acc;
      },
      { addresses: [], apyPayload: [] },
    );

    await Promise.all([setIdentities(api, addresses), calculateValidatorsApy(api, apyPayload)]);
  };

  const setValidatorsStake = async (api: ApiPromise, era: number): Promise<Record<AccountID, string>> => {
    const data = await api.query.staking.erasStakersClipped.entries(era);

    const { full, short } = data.reduce(
      (acc, [storageKey, type]) => {
        const address = storageKey.args[1].toString();
        const totalStake = type.total.toString();
        const payload = { totalStake, address, ownStake: type.own.toString() };

        acc.full = { ...acc.full, [address]: payload };
        acc.short = { ...acc.short, [address]: totalStake };

        return acc;
      },
      { full: {}, short: {} },
    );

    setValidators((prev) =>
      Object.entries(full).reduce((acc, [address, prefs]) => {
        const payload = { ...prev[address], ...(prefs as ValidatorMap) };

        return { ...acc, [address]: payload };
      }, {}),
    );

    return short;
  };

  const setValidatorsPrefs = async (api: ApiPromise, era: number): Promise<Record<AccountID, number>> => {
    const data = await api.query.staking.erasValidatorPrefs.entries(era);

    const { full, short } = data.reduce(
      (acc, [storageKey, type]) => {
        const address = storageKey.args[1].toString();
        const commission = parseFloat(type.commission.toHuman() as string);
        const payload = { address, commission, blocked: type.blocked.toHuman() };

        acc.full = { ...acc.full, [address]: payload };
        acc.short = { ...acc.short, [address]: commission };

        return acc;
      },
      { full: {}, short: {} },
    );

    setValidators((prev) =>
      Object.entries(full).reduce((acc, [address, prefs]) => {
        const payload = { ...prev[address], ...(prefs as ValidatorMap) };

        return { ...acc, [address]: payload };
      }, {}),
    );

    return short;
  };

  const getMaxValidators = (api: ApiPromise): number => {
    return api.consts.staking.maxNominations.toNumber();
  };

  const setIdentities = async (api: ApiPromise, addresses: AccountID[]): Promise<void> => {
    const subIdentities = await getSubIdentities(api, addresses);
    const parentIdentities = await getParentIdentities(api, subIdentities);

    setValidators((prev) =>
      Object.entries(prev).reduce((acc, [address, validator]) => {
        const payload = { ...validator, identity: parentIdentities[address] };

        return { ...acc, [address]: payload };
      }, {}),
    );
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

  const calculateValidatorsApy = async (api: ApiPromise, validators: Validator[]) => {
    const apys = await getValidatorsApy(api, validators);

    setValidators((prev) =>
      Object.entries(apys).reduce((acc, [address, apy]) => {
        const payload = { ...prev[address], apy };

        return { ...acc, [address]: payload };
      }, {}),
    );
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

  const getMinNominatorBond = async (api: ApiPromise): Promise<string> => {
    try {
      return (await api.query.staking.minNominatorBond()).toString();
    } catch (error) {
      console.warn(error);

      return '0';
    }
  };

  return {
    validators,
    subscribeActiveEra,
    subscribeStaking,
    getValidators,
    getMaxValidators,
    getNominators,
    getMinNominatorBond,
  };
};
