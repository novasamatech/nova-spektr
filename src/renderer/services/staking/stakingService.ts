import { ApiPromise } from '@polkadot/api';
import { useEffect, useState } from 'react';

import { AccountID, ChainId } from '@renderer/domain/shared-kernel';
import { useSubscription } from '@renderer/services/subscription/subscriptionService';
import { IStakingService, StakingMap } from './common/types';

export const useStaking = (chainId?: ChainId, api?: ApiPromise): IStakingService => {
  // const { data } = useQuery<Rewards>(GET_TOTAL_REWARDS, {
  //   variables: {
  //     first: 10,
  //     address: '111B8CxcmnWbuDLyGvgUmRezDCK1brRZmvUuQ6SrFdMyc3S',
  //   },
  // });
  const eraSubscription = useSubscription<ChainId>();
  const ledgerSubscription = useSubscription<AccountID>();

  const [_, setActiveEra] = useState<number>();
  const [activeAccounts, setActiveAccounts] = useState<AccountID[]>([]);
  const [staking, setStaking] = useState<StakingMap>({});

  useEffect(() => {
    if (!api) return;

    (async () => {
      await eraSubscription.unsubscribeAll();
      subscribeActiveEra();
    })();
  }, [api]);

  const subscribeActiveEra = () => {
    if (!chainId || !api) return;

    const unsubscribe = api.query.staking.activeEra((data: any) => {
      try {
        const unwrappedData = data.unwrap();
        setActiveEra(unwrappedData.get('index').toNumber());
      } catch (error) {
        console.warn(error);
      }
    });

    eraSubscription.subscribe(chainId, unsubscribe as Promise<any>);
  };

  const getLedger = async (newAccounts: AccountID[]) => {
    const apiHasChanges = activeAccounts.length === newAccounts.length;
    if (apiHasChanges) {
      await resubscribeLedgerAll(newAccounts);
    } else {
      await resubscribeLedger(newAccounts);
    }

    setActiveAccounts(newAccounts);
  };

  const subscribeLedger = async (accountId: AccountID): Promise<void> => {
    if (!chainId) return;

    const controller = await getController(accountId);

    const unsubscribe = api?.query.staking.ledger(controller || accountId, async (data) => {
      if (!data.isNone) {
        try {
          const { active, stash, total, unlocking } = data.unwrap();
          const formattedUnlocking = unlocking.toArray().map((unlock) => ({
            value: unlock.value.toString(),
            era: unlock.era.toString(),
          }));

          setStaking((prev) => ({
            ...prev,
            [accountId]: {
              accountId,
              chainId,
              controller: controller || stash.toHuman(),
              stash: stash.toHuman(),
              active: active.toString(),
              total: total.toString(),
              unlocking: formattedUnlocking,
            },
          }));
        } catch (error) {
          console.warn(error);
          setStaking((prev) => ({ ...prev, [accountId]: undefined }));
        }
      } else if (staking[accountId]?.chainId === chainId) {
        await ledgerSubscription.unsubscribe(accountId);
        await subscribeLedger(accountId);
      } else {
        setStaking((prev) => ({ ...prev, [accountId]: undefined }));
      }
    });

    ledgerSubscription.subscribe(accountId, unsubscribe as Promise<any>);
  };

  const resubscribeLedgerAll = async (newAccounts: AccountID[]): Promise<void> => {
    await ledgerSubscription.unsubscribeAll();
    await Promise.all(newAccounts.map(subscribeLedger));
  };

  const resubscribeLedger = async (newAccounts: AccountID[]): Promise<void> => {
    if (newAccounts.length < activeAccounts.length) {
      const removedAccounts = activeAccounts.filter((account) => !newAccounts.includes(account));
      await Promise.all(removedAccounts.map(ledgerSubscription.unsubscribe));

      const newStaking = newAccounts.reduce(
        (acc, account) => ({ ...acc, [account]: staking[account] }),
        {} as StakingMap,
      );

      setStaking(newStaking);
    } else {
      const incomingAccounts = newAccounts.filter((account) => !activeAccounts.includes(account));
      await Promise.all(incomingAccounts.map(subscribeLedger));
    }
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

  const getController = async (account: AccountID): Promise<string | undefined> => {
    if (!api) return undefined;

    try {
      const data = await api?.query.staking.bonded(account);
      if (data.isNone) return undefined;
      const unwrappedData = data.unwrap();

      return unwrappedData.toString();
    } catch (error) {
      console.warn(error);

      return undefined;
    }
  };

  // const bond = (): Promise<void> => {
  // if (!activeNetwork) return;
  //
  // const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
  // const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);
  //
  // const unsignedRemark = methods.staking.nominate({ targets: randomValidators }, info, options);
  // const unsignedBond = methods.staking.bond(
  //   { value: '1000000000000', payee: 'Stash', controller: address },
  //   info,
  //   options,
  // );
  // const unsignedBatch = methods.utility.batchAll(
  //   { calls: [unsignedBond.method, unsignedRemark.method] },
  //   info,
  //   options,
  // );
  // const signingPayload = construct.signingPayload(unsignedBatch, { registry });
  //   return Promise.resolve();
  // };
  //
  // const bondExtra = (): Promise<void> => {
  // if (!activeNetwork) return;
  //
  // const address = '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW';
  // const { registry, options, info } = await offlineTxMetadata(address, activeNetwork?.label, activeNetwork?.value);
  //
  // const unsignedBondExtra = methods.staking.bondExtra({ maxAdditional: '1000000000000' }, info, options);
  // const signingPayload = construct.signingPayload(unsignedBondExtra, { registry });
  //   return Promise.resolve();
  // };
  //
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
  //
  // const getIdentities = (): Promise<void> => {
  //   // Polkadot user with SubIdentity - 11uMPbeaEDJhUxzU4ZfWW9VQEsryP9XqFcNRfPdYda6aFWJ
  //   // ["14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu", {Raw: "4"}]
  //   // Raw - subIdentity name
  //   const data = (await activeNetwork?.value.query.identity.superOf(
  //     '11uMPbeaEDJhUxzU4ZfWW9VQEsryP9XqFcNRfPdYda6aFWJ',
  //   )) as any;
  //   const unwrappedData = data.unwrap();
  //   console.log(unwrappedData.toHuman());
  //
  //   // Parent of previous subIdentity - 14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu
  //   // const data = (await activeNetwork?.value.query.identity.identityOf(
  //   //   '14QBQABMSFBsT3pDTaEQdshq7ZLmhzKiae2weZH45pw5ErYu',
  //   // )) as any;
  //   // const unwrappedData = data.unwrap();
  //   // console.log(unwrappedData.toHuman());
  //   return Promise.resolve();
  // };
  //
  // const getMaxValidators = (): Promise<void> => {
  //   const data = activeNetwork?.value.consts.staking.maxNominations;
  //   return Promise.resolve();
  // };
  //
  // const getRewards = (): Promise<void> => {
  //   return Promise.resolve();
  // };
  //
  // const getValidators = (): Promise<void> => {
  //   const data = (await activeNetwork?.value.query.staking.erasStakersClipped.entries(eraIndex)) as any;
  //   const wholeData = data.map(([storageKey, type]: any[]) => ({
  //     validator: storageKey.toHuman(),
  //     value: type.toHuman(),
  //   }));
  //   setRandomValidators(wholeData.map((d: any) => d.validator[1]));
  //
  //   console.log(wholeData);
  //   return Promise.resolve();
  // };
  //
  // const getValidatorsPrefs = (): Promise<void> => {
  //   const data = (await activeNetwork?.value.query.staking.erasValidatorPrefs.entries(eraIndex)) as any;
  //   console.log(
  //     data.map(([storageKey, type]: any[]) => ({
  //       validator: storageKey.toHuman(),
  //       prefs: type.toHuman(),
  //     })),
  //   );
  //   return Promise.resolve();
  // };

  return {
    staking,
    getLedger,
    getNominators,
    // getBonded,
    // bond,
    // bondExtra,
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
