import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types/submittable';
import { type BN } from '@polkadot/util';
import { type Store, type UnitValue, createEffect, createEvent, createStore, sample } from 'effector';

import { takeLast } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { transactionService } from '@/domains/network';

type Params = {
  active?: Store<boolean>;
  extrinsic: Store<SubmittableExtrinsic<'promise'> | null>;
  api?: Store<ApiPromise | null>;
};

type FeeCalculationRequest = {
  extrinsic: SubmittableExtrinsic<'promise'>;
  api: ApiPromise | null;
};

export const createFeeCalculator = ({ active = createStore(true), extrinsic, api }: Params) => {
  const $fee = createStore<BN | null>(null);
  const $api = api ?? createStore<ApiPromise | null>(null);
  const $error = createStore<Error | null>(null);
  const retry = createEvent();

  const fetchFeeFx = takeLast({
    fn: async ({ extrinsic, api }: FeeCalculationRequest): Promise<BN | null> => {
      if (nonNullable(api)) {
        return await transactionService.getSplitExtrinsicFee(extrinsic, api);
      }
      return await transactionService.getExtrinsicFee(extrinsic);
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
    clock: [extrinsic.updates, active.updates, $api.updates, retry],
    source: { active, extrinsic, api: $api },
  }).filterMap(({ active, extrinsic, api }) => {
    if (!active) return undefined;
    if (extrinsic) {
      return { extrinsic, api };
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

  // Aborts are the normal outcome of a superseded recalculation, not a failure.
  sample({
    clock: fetchFeeFx.failData,
    filter: (error) => !isAbortError(error),
    target: $error,
  });

  $error.reset(fetchFeeFx.done, retry);

  return {
    $: $fee,
    $error,
    $pending: fetchFeeFx.pending,
    retry,
  };
};
