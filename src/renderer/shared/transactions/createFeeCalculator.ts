import { type SubmittableExtrinsic } from '@polkadot/api/types/submittable';
import { type BN } from '@polkadot/util';
import { type Store, type UnitValue, createEffect, createStore, sample } from 'effector';

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
  const $fee = createStore<BN | null>(null);

  const fetchFeeFx = takeLast({
    fn: async ({ extrinsic }: FeeCalculationRequest): Promise<BN | null> => {
      return await transactionService.getExtrinsicFee(extrinsic).catch((err) => {
        console.error(err);
        return null;
      });
    },
    key: () => 'feeCalculation',
  });

  const isAbortError = (err: UnitValue<typeof fetchFeeFx.failData>) =>
    err && 'name' in err && err.name === 'AbortError';

  const logErrorFx = createEffect((err: UnitValue<typeof fetchFeeFx.failData>) => {
    if (isAbortError(err)) {
      return;
    }

    console.error('fee calculation failed', err);
  });

  sample({
    clock: extrinsic,
    filter: nullable,
    fn: () => null,
    target: $fee,
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
    clock: fetchFeeFx.failData,
    filter: (error) => !isAbortError(error),
    fn: () => null,
    target: $fee,
  });

  sample({
    clock: fetchFeeFx.failData,
    target: logErrorFx,
  });

  return {
    $: $fee,
    $pending: fetchFeeFx.pending,
  };
};
