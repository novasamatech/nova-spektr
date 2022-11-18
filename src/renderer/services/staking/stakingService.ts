import { ApiPromise } from '@polkadot/api';
import { construct, methods } from '@substrate/txwrapper-polkadot';
import { useRef, useState } from 'react';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { createTxMetadata } from '@renderer/utils/substrate';
import { IStakingService, Payee, StakingMap, ValidatorMap } from './common/types';

export const useStaking = (): IStakingService => {
  // const { data } = useQuery<Rewards>(GET_TOTAL_REWARDS, {
  //   variables: {
  //     first: 10,
  //     address: '111B8CxcmnWbuDLyGvgUmRezDCK1brRZmvUuQ6SrFdMyc3S',
  //   },
  // });
  const eraSubscription = useSubscription<ChainId>();
  const ledgerSubscription = useSubscription<ChainId>();
  const validatorsSubscription = useSubscription<ChainId>();

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
        const accountId: string = accounts[index];

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

          return {
            [accountId]: {
              accountId,
              chainId,
              controller: controllers[index] || stash.toHuman(),
              stash: stash.toHuman(),
              active: active.toString(),
              total: total.toString(),
              unlocking: formattedUnlocking,
            },
          };
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

  const subscribeValidators = async (chainId: ChainId, api: ApiPromise): Promise<void> => {
    await validatorsSubscription.unsubscribeAll();
    await listenToValidators(chainId, api);
    await listenToValidatorsPrefs(chainId, api);
    // await listenToIdentities();
  };

  // @ts-ignore
  const getMaxValidators = (api: ApiPromise): number => {
    return api.consts.staking.maxNominations.toNumber();
  };

  const listenToValidators = async (chainId: ChainId, api: ApiPromise): Promise<void> => {
    if (!era.current) throw new Error('No ActiveEra');

    const unsubscribe = api.query.staking.erasStakersClipped.entries(era.current, (data: any) => {
      setValidators((prev) =>
        data.reduce((acc: ValidatorMap, [storageKey, type]: any) => {
          // era, validatorAddress
          const [_, validatorAddress] = storageKey.args;
          const address = validatorAddress.toString();

          const payload = {
            ...prev[address],
            address,
            ownStake: type.own.toString(),
            totalStake: type.total.toString(),
          };

          return { ...acc, [address]: payload };
        }, {}),
      );
    });

    validatorsSubscription.subscribe(chainId, unsubscribe);
  };

  const listenToValidatorsPrefs = async (chainId: ChainId, api: ApiPromise): Promise<void> => {
    if (!era.current) throw new Error('No ApiPromise or ActiveEra');

    const unsubscribe = api.query.staking.erasValidatorPrefs.entries(era.current, (data: any) => {
      setValidators((prev) => {
        return data.reduce((acc: ValidatorMap, [storageKey, type]: any) => {
          // era, validatorAddress
          const [_, validatorAddress] = storageKey.args;
          const address = validatorAddress.toString();
          const { commission, blocked } = type.toHuman();

          const payload = {
            ...prev[address],
            address,
            blocked,
            commission: parseFloat(commission),
          };

          return { ...acc, [address]: payload };
        }, {});
      });
    });

    validatorsSubscription.subscribe(chainId, unsubscribe);
  };

  // @ts-ignore
  const getIdentities = async (api: ApiPromise, address: AccountID): Promise<void> => {
    if (!era.current) throw new Error('No ApiPromise or ActiveEra');

    // Polkadot user with SubIdentity - 11uMPbeaEDJhUxzU4ZfWW9VQEsryP9XqFcNRfPdYda6aFWJ
    // ["14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu", {Raw: "4"}]
    // Raw - subIdentity name
    try {
      const data = await api.query.identity.superOf(address);
      const unwrappedData = data.unwrap();
      console.log(unwrappedData.toHuman());
    } catch (error) {
      console.warn(error);
    }

    // Parent of previous subIdentity - 14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu
    // const data = (await activeNetwork?.value.query.identity.identityOf(
    //   '14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu',
    // )) as any;
    // const unwrappedData = data.unwrap();
    // console.log(unwrappedData.toHuman());
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
    subscribeValidators,
    getMaxValidators,
    bondAndNominate,
    bondExtra,

    getNominators,
    // rebond,
    // unbond,
    // withdrawUnbonded,
    // getIdentities,
    // getMaxValidators,
    // getRewards,
    // getValidators,
    // getValidatorsPrefs,
  };
};
