import { useEffect, useState } from 'react';

import { ChainId } from '@renderer/domain/shared-kernel';
import { useSubscription } from '../subscription/subscriptionService';
import { IStakingService, StakingsMap } from './common/types';

const useStaking = (): IStakingService => {
  // const { data } = useQuery<Rewards>(GET_TOTAL_REWARDS, {
  //   variables: {
  //     first: 10,
  //     address: '111B8CxcmnWbuDLyGvgUmRezDCK1brRZmvUuQ6SrFdMyc3S',
  //   },
  // });

  // @ts-ignore
  const eraSubscription = useSubscription<ChainId>();
  // @ts-ignore
  const ledgerSubscription = useSubscription<ChainId>();

  // @ts-ignore
  const [staking, setStaking] = useState<StakingsMap>({});

  useEffect(() => {}, []);

  // @ts-ignore
  const getEra = async () => {
    // Gets data about epoch and era
    // activeNetwork?.value.derive.session.progress((result) => {
    //   console.log('start => ', sessionInfo?.activeEraStart.toHuman());
    //   console.log('progress => ', sessionInfo?.eraProgress.toHuman());
    //   console.log('length => ', sessionInfo?.eraLength.toHuman());
    // });
    // const data = (await activeNetwork?.value.query.staking.activeEra()) as any;
    // const unwrappedData = data.unwrap();
    // setEraIndex(unwrappedData.get('index').toNumber());
    // console.log(unwrappedData.get('index').toHuman(), unwrappedData.get('start').toHuman());
    // 5,761 – "1,667,361,402,002" - Westend
  };

  const getBonded = (): Promise<void> => {
    // const data = (await activeNetwork?.value.query.staking.ledger(
    //   '15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7',
    // )) as any;
    // const unwrappedData = data.unwrap();
    // console.log(unwrappedData.toHuman());
    // active: "2,701,475,935,769" - Westend
    // claimedRewards: ["5,673", "5,674", "5,675", "5,676", "5,677", "5,678", "5,679", "5,680", "5,681", "5,682", …] (84)
    // stash: "5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW"
    // total: "2,701,475,935,769"
    // unlocking: [] (0)
    // unlocking: [{value: "900,000,000,000", era: "911"}] - Filled variant
    return Promise.resolve();
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
    getBonded,
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

export default useStaking;
