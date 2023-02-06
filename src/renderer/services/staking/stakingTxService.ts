import { ApiPromise } from '@polkadot/api';
import { construct, methods } from '@substrate/txwrapper-polkadot';

import { AccountID } from '@renderer/domain/shared-kernel';
import { IStakingTxService, Payee } from '@renderer/services/staking/common/types';
import { createTxMetadata } from '@renderer/shared/utils/substrate';

export const useStakingTx = (): IStakingTxService => {
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
    bondExtra,
    bondAndNominate,
  };
};
