import { type SubmittableExtrinsic } from '@polkadot/api/types/submittable';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, type UnitValue, createEffect, createStore, restore, sample } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { transactionService } from '@/domains/network';

type Params = {
  active?: Store<boolean>;
  extrinsic: Store<SubmittableExtrinsic<'promise'> | null>;
};

export const createFeeCalculator = ({ active = createStore(true), extrinsic }: Params) => {
  const $fee = createStore(BN_ZERO);

  const fetchFeeFx = createEffect((extrinsic: SubmittableExtrinsic<'promise'>) => {
    return transactionService.getExtrinsicFee(extrinsic).then((x) => new BN(x));
  });

  const $pending = restore(fetchFeeFx.pending.updates, true);

  const logErrorFx = createEffect((res: UnitValue<typeof fetchFeeFx.fail>) => {
    console.error('fee calculation faied', res);
  });

  sample({
    clock: extrinsic,
    filter: nullable,
    fn: () => BN_ZERO,
    target: $fee,
  });

  const feeRequested = sample({
    clock: [extrinsic.updates, active.updates],
    source: { active, extrinsic },
  }).filterMap(({ active, extrinsic }) => {
    if (!active) return undefined;
    if (extrinsic) return extrinsic;
  });

  sample({
    clock: feeRequested,
    target: fetchFeeFx,
  });

  sample({
    clock: fetchFeeFx.doneData,
    source: extrinsic,
    filter: nonNullable,
    fn: (_, fee) => fee,
    target: $fee,
  });

  sample({
    clock: fetchFeeFx.fail,
    source: extrinsic,
    filter: nonNullable,
    fn: (_) => BN_ZERO,
    target: $fee,
  });

  sample({
    clock: fetchFeeFx.fail,
    target: logErrorFx,
  });

  return {
    $: $fee,
    $pending,
  };
};
