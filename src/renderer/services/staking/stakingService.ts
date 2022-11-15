import { ApiPromise } from '@polkadot/api';
import { construct, methods } from '@substrate/txwrapper-polkadot';
import { useState } from 'react';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { createTxMetadata } from '@renderer/utils/substrate';
import { IStakingService, Payee, StakingMap, Validator } from './common/types';

export const useStaking = (chainId?: ChainId, api?: ApiPromise): IStakingService => {
  // const { data } = useQuery<Rewards>(GET_TOTAL_REWARDS, {
  //   variables: {
  //     first: 10,
  //     address: '111B8CxcmnWbuDLyGvgUmRezDCK1brRZmvUuQ6SrFdMyc3S',
  //   },
  // });
  const eraSubscription = useSubscription<ChainId>();
  const ledgerSubscription = useSubscription<ChainId>();

  const [staking, setStaking] = useState<StakingMap>({});
  const [activeEra, setActiveEra] = useState<number>();
  const [validators, setValidators] = useState<Validator[]>([]);
  const [activeAccounts, setActiveAccounts] = useState<AccountID[]>([]);

  const subscribeActiveEra = async (): Promise<void> => {
    await ledgerSubscription.unsubscribeAll();
    listenToActiveEra();
  };

  const listenToActiveEra = () => {
    if (!chainId || !api) return;

    const unsubscribe = api.query.staking.activeEra((data: any) => {
      try {
        const unwrappedData = data.unwrap();
        setActiveEra(unwrappedData.get('index').toNumber());
      } catch (error) {
        console.warn(error);
      }
    });

    eraSubscription.subscribe(chainId, unsubscribe);
  };

  const subscribeLedger = async (newAccounts: AccountID[]): Promise<void> => {
    const apiHasChanges = activeAccounts.length === newAccounts.length;
    if (apiHasChanges) {
      setStaking({});
    }

    await ledgerSubscription.unsubscribeAll();
    await listenToLedger(newAccounts);

    setActiveAccounts(newAccounts);
  };

  const listenToLedger = async (accounts: AccountID[]): Promise<void> => {
    if (!chainId || !api) return;

    const controllers = await getControllers(accounts);

    const unsubscribe = api.query.staking.ledger.multi(controllers, async (data) => {
      let isControllerChanged = false;

      const newStaking = data.map((ledger, index) => {
        const accountId: string = accounts[index];

        if (ledger.isNone) {
          isControllerChanged ||= Boolean(staking[accountId]?.chainId === chainId);

          return { [accountId]: undefined };
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
        await listenToLedger(accounts);
      }
    });

    ledgerSubscription.subscribe(chainId, unsubscribe);
  };

  const getNominators = async (account: AccountID): Promise<string[]> => {
    if (!api) return [];

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

  const getControllers = async (accounts: AccountID[]): Promise<AccountID[]> => {
    if (!api) return [];

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
    address: AccountID,
    value: string,
    payee: Payee,
    targets: AccountID[],
  ): Promise<string> => {
    if (!api) throw new Error('No ApiPromise');

    const { registry, options, info } = await createTxMetadata(address, api);

    const bondPayload = { value, payee, controller: address };
    const unsignedBond = methods.staking.bond(bondPayload, info, options);

    const nominatePayload = { targets };
    const unsignedNominate = methods.staking.nominate(nominatePayload, info, options);

    const batchPayload = { calls: [unsignedNominate.method, unsignedBond.method] };
    const unsignedBatch = methods.utility.batchAll(batchPayload, info, options);

    return construct.signingPayload(unsignedBatch, { registry });
  };

  const bondExtra = async (address: AccountID, value: string): Promise<string> => {
    if (!api) throw new Error('No ApiPromise');

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

  // @ts-ignore
  const getMaxValidators = (): number => {
    if (!api) throw new Error('No ApiPromise');

    return api.consts.staking.maxNominations.toNumber();
  };

  // @ts-ignore
  const getValidators = async (): Promise<void> => {
    if (!api || !activeEra) throw new Error('No ApiPromise or ActiveEra');

    try {
      const data = await api.query.staking.erasStakersClipped.entries(activeEra);
      const validators = data.map(([storageKey, type]) => {
        const [_, validatorAddress] = storageKey.args;
        const { own, total } = type.toHuman();

        return {
          address: validatorAddress.toString(),
          name: '',
          apy: 0,
          ownStake: own,
          totalStake: total,
          isOversubscribed: false,
          isSlashed: false,
          identity: undefined,
        } as Validator;
      });
      setValidators(validators);
    } catch (error) {
      console.warn(error);
      setValidators([]);
    }
  };

  // @ts-ignore
  const getValidatorsPrefs = async (): Promise<void> => {
    if (!api || !activeEra) throw new Error('No ApiPromise or ActiveEra');

    const data = await api.query.staking.erasValidatorPrefs.entries(activeEra);
    console.log(
      data.map(([storageKey, type]: any[]) => ({
        validator: storageKey.toHuman(),
        prefs: type.toHuman(),
      })),
    );
  };

  // @ts-ignore
  const getIdentities = async (address: AccountID): Promise<void> => {
    if (!api || !activeEra) throw new Error('No ApiPromise or ActiveEra');

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

  return {
    staking,
    validators,
    subscribeActiveEra,
    subscribeLedger,
    getNominators,
    bondAndNominate,
    bondExtra,
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
