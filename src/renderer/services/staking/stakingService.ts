import { ApiPromise } from '@polkadot/api';
import { u8aToString } from '@polkadot/util';
import { construct, methods } from '@substrate/txwrapper-polkadot';
import { useRef, useState } from 'react';

import { getValidatorsApy } from '@renderer/services/staking/apyCalculator';
import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { createTxMetadata } from '@renderer/utils/substrate';
import {
  Identity,
  IStakingService,
  Payee,
  Staking,
  StakingMap,
  SubIdentity,
  Validator,
  ValidatorMap,
} from './common/types';

export const useStaking = (): IStakingService => {
  // const { data } = useQuery<Rewards>(GET_TOTAL_REWARDS, {
  //   variables: {
  //     first: 10,
  //     address: '111B8CxcmnWbuDLyGvgUmRezDCK1brRZmvUuQ6SrFdMyc3S',
  //   },
  // });
  const eraSubscription = useSubscription<ChainId>();
  const ledgerSubscription = useSubscription<ChainId>();

  const era = useRef<number>();
  const [staking, setStaking] = useState<StakingMap>({});
  const [validators, setValidators] = useState<ValidatorMap>({});

  const subscribeActiveEra = async (chainId: ChainId, api: ApiPromise): Promise<void> => {
    await ledgerSubscription.unsubscribeAll();
    await listenToActiveEra(chainId, api);
  };

  const listenToActiveEra = async (chainId: ChainId, api: ApiPromise): Promise<void> => {
    return new Promise((resolve, reject) => {
      const unsubscribe = api.query.staking.activeEra((data: any) => {
        try {
          const unwrappedData = data.unwrap();
          era.current = unwrappedData.get('index').toNumber();
          resolve();
        } catch (error) {
          console.warn(error);
          reject();
        }
      });

      eraSubscription.subscribe(chainId, unsubscribe);
    });
  };

  const subscribeLedger = async (chainId: ChainId, api: ApiPromise, newAccounts: AccountID[]): Promise<void> => {
    const apiHasChanged = Object.keys(staking).length === newAccounts.length;
    if (apiHasChanged) {
      setStaking({});
    }

    await ledgerSubscription.unsubscribeAll();
    await listenToLedger(chainId, api, newAccounts);
  };

  const listenToLedger = async (chainId: ChainId, api: ApiPromise, accounts: AccountID[]): Promise<void> => {
    const controllers = await getControllers(api, accounts);

    const unsubscribe = api.query.staking.ledger.multi(controllers, async (data) => {
      let isControllerChanged = false;

      const newStaking = data.map((ledger, index) => {
        const accountId = accounts[index];

        if (ledger.isNone) {
          const isSameChain = Boolean(staking[accountId]?.chainId === chainId);
          isControllerChanged ||= isSameChain;

          return isSameChain ? staking[accountId] : { [accountId]: undefined };
        }

        try {
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

          return { [accountId]: payload };
        } catch (error) {
          console.warn(error);

          return { [accountId]: undefined };
        }
      });
      setStaking(Object.assign({}, ...newStaking));

      if (isControllerChanged) {
        await ledgerSubscription.unsubscribeAll();
        await listenToLedger(chainId, api, accounts);
      }
    });

    ledgerSubscription.subscribe(chainId, unsubscribe);
  };

  const getValidators = async (chainId: ChainId, api: ApiPromise): Promise<void> => {
    const [totalStake, commission] = await Promise.all([setValidatorsStake(api), setValidatorsPrefs(api)]);

    const { addresses, apyPayload } = Object.entries(totalStake).reduce(
      (acc, [address, totalStake]) => {
        acc.addresses.push(address);
        acc.apyPayload.push({ address, totalStake, commission: commission[address] });

        return acc;
      },
      { addresses: [], apyPayload: [] } as Record<string, any[]>,
    );

    await Promise.all([setIdentities(api, addresses), calculateValidatorsApy(api, apyPayload)]);
  };

  const setValidatorsStake = async (api: ApiPromise): Promise<Record<AccountID, string>> => {
    if (!era.current) throw new Error('No ActiveEra');

    const data = await api.query.staking.erasStakersClipped.entries(era.current);

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

  const setValidatorsPrefs = async (api: ApiPromise): Promise<Record<AccountID, number>> => {
    if (!era.current) throw new Error('No ApiPromise or ActiveEra');

    const data = await api.query.staking.erasValidatorPrefs.entries(era.current);

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

    return subIdentities.reduce((acc, identity, index) => {
      const payload = { sub: addresses[index], parent: addresses[index], subName: '' };
      if (!identity.isNone) {
        const [address, rawData] = identity.unwrap();
        payload.parent = address.toHuman();
        payload.subName = rawData.isRaw ? u8aToString(rawData.asRaw) : rawData.value.toString();
      }

      return acc.concat(payload);
    }, [] as SubIdentity[]);
  };

  const getParentIdentities = async (
    api: ApiPromise,
    subIdentities: SubIdentity[],
  ): Promise<Record<AccountID, Identity>> => {
    const identityAddresses = subIdentities.map((identity) => identity.parent);

    const parentIdentities = await api.query.identity.identityOf.multi(identityAddresses);

    return parentIdentities.reduce((acc, identity, index) => {
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
    }, {} as Record<AccountID, Identity>);
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

  const bondAndNominate = async (
    api: ApiPromise,
    address: AccountID,
    value: string,
    payee: Payee,
    targets: AccountID[],
  ): Promise<string> => {
    const { registry, options, info } = await createTxMetadata(address, api);

    const bondPayload = { value, payee, controller: address };
    const unsignedBond = methods.staking.bond(bondPayload, info, options);

    const nominatePayload = { targets };
    const unsignedNominate = methods.staking.nominate(nominatePayload, info, options);

    const batchPayload = { calls: [unsignedNominate.method, unsignedBond.method] };
    const unsignedBatch = methods.utility.batchAll(batchPayload, info, options);

    return construct.signingPayload(unsignedBatch, { registry });
  };

  const bondExtra = async (api: ApiPromise, address: AccountID, value: string): Promise<string> => {
    const { registry, options, info } = await createTxMetadata(address, api);

    const bondExtraPayload = { maxAdditional: value };
    const unsignedBondExtra = methods.staking.bondExtra(bondExtraPayload, info, options);

    return construct.signingPayload(unsignedBondExtra, { registry });
  };

  // const rebond = (): Promise<void> => {
  // if (!activeNetwork) return;
  //
  // const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
  // const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);
  //
  // const unsignedRebond = methods.staking.rebond({ value: '100000000000' }, info, options);
  // const signingPayload = construct.signingPayload(unsignedRebond, { registry });
  //   return Promise.resolve();
  // };
  //
  // const unbond = (): Promise<void> => {
  // if (!activeNetwork) return;
  //
  // const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
  // const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);
  //
  // // Must be used in batchAll([chill, unbond]) if we are going below InsufficientBond value
  // // "If a user encounters the InsufficientBond error when calling this extrinsic,
  // // they should call chill first in order to free up their bonded funds."
  // // const unsignedChill = methods.staking.chill({}, info, options);
  // const unsignedUnbond = methods.staking.unbond({ value: '100000000000' }, info, options);
  // const signingPayload = construct.signingPayload(unsignedUnbond, { registry });
  //   return Promise.resolve();
  // };
  //
  // const withdrawUnbonded = (): Promise<void> => {
  // if (!activeNetwork) return;
  //
  // const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
  // const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);
  //
  // const unsignedWithdraw = methods.staking.withdrawUnbonded({ numSlashingSpans: 1 }, info, options);
  // const signingPayload = construct.signingPayload(unsignedWithdraw, { registry });
  //   return Promise.resolve();
  // }

  return {
    staking,
    validators,
    subscribeActiveEra,
    subscribeLedger,
    getValidators,
    getMaxValidators,
    bondAndNominate,
    bondExtra,

    getNominators,
    // rebond,
    // unbond,
    // withdrawUnbonded,
    // getRewards,
  };
};
