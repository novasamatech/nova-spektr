import { type SubmittableExtrinsic } from '@polkadot/api/types/submittable';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, type UnitValue, combine, createEffect, createStore, sample } from 'effector';

import { takeLast } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { transactionService } from '@/domains/network';

type Params = {
  active?: Store<boolean>;
  extrinsic: Store<SubmittableExtrinsic<'promise'> | null>;
};

type FeeCalculationRequest = {
  extrinsic: SubmittableExtrinsic<'promise'>;
};

export const createFeeCalculator = ({ active = createStore(true), extrinsic }: Params) => {
  const $fee = createStore(BN_ZERO);
  const $isInitialized = createStore(false);

  const fetchFeeFx = takeLast({
    fn: async ({ extrinsic }: FeeCalculationRequest): Promise<BN> => {
      const fee = await transactionService.getExtrinsicFee(extrinsic).then((x) => new BN(x));
      return fee;
    },
    key: () => 'feeCalculation',
  });

  const logErrorFx = createEffect((err: UnitValue<typeof fetchFeeFx.failData>) => {
    if (err && 'name' in err && err.name === 'AbortError') {
      return;
    }

    console.error('fee calculation faied', err);
  });

  sample({
    clock: extrinsic,
    filter: nullable,
    fn: () => false,
    target: $isInitialized,
  });

  const feeRequested = sample({
    clock: [extrinsic.updates, active.updates],
    source: { active, extrinsic },
  }).filterMap(({ active, extrinsic }) => {
    if (!active) return undefined;
    if (extrinsic) {
      return { extrinsic };
    }
  });

  sample({
    clock: feeRequested,
    target: fetchFeeFx,
  });

  sample({
    clock: fetchFeeFx.doneData,
    target: $fee,
  });

  sample({
    clock: fetchFeeFx.doneData,
    fn: () => true,
    target: $isInitialized,
  });

  sample({
    clock: fetchFeeFx.failData,
    target: logErrorFx,
  });

  const $pendingFee = combine(fetchFeeFx.pending, $isInitialized, (pending, initialized) => pending || !initialized);

  return {
    $: $fee,
    $pending: $pendingFee,
  };
};
