import { type SubmittableExtrinsic } from '@polkadot/api/types/submittable';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, type UnitValue, createEffect, createStore, restore, sample } from 'effector';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { transactionService } from '@/domains/network';

type Params = {
  active?: Store<boolean>;
  extrinsic: Store<SubmittableExtrinsic<'promise'> | null>;
};

type FeeCalculationRequest = {
  extrinsic: SubmittableExtrinsic<'promise'>;
  requestId: string;
};

type FeeCalculationResult = {
  fee: BN;
  requestId: string;
};

export const createFeeCalculator = ({ active = createStore(true), extrinsic }: Params) => {
  const $fee = createStore(BN_ZERO);
  const $currentRequestId = createStore<string | null>(null);

  const fetchFeeFx = createEffect(
    async ({ extrinsic, requestId }: FeeCalculationRequest): Promise<FeeCalculationResult> => {
      const fee = await transactionService.getExtrinsicFee(extrinsic).then((x) => new BN(x));
      return { fee, requestId };
    },
  );

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

  sample({
    clock: extrinsic,
    filter: nullable,
    fn: () => null,
    target: $currentRequestId,
  });

  const feeRequested = sample({
    clock: [extrinsic.updates, active.updates],
    source: { active, extrinsic },
  }).filterMap(({ active, extrinsic }) => {
    if (!active) return undefined;
    if (extrinsic) {
      const requestId = `${Date.now()}-${Math.random()}`;
      return { extrinsic, requestId };
    }
  });

  sample({
    clock: feeRequested,
    fn: ({ requestId }) => requestId,
    target: $currentRequestId,
  });

  sample({
    clock: feeRequested,
    target: fetchFeeFx,
  });

  sample({
    clock: fetchFeeFx.doneData,
    source: $currentRequestId,
    filter: (currentRequestId, { requestId }) => {
      return currentRequestId === requestId;
    },
    fn: (_, { fee }) => fee,
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
