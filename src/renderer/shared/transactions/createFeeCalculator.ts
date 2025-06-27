import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/types/submittable';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, type UnitValue, combine, createEffect, createStore, restore, sample } from 'effector';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { transactionService } from '@/entities/transaction';

type Params = {
  $active?: Store<boolean>;
  $transaction: Store<Transaction | null>;
  $api: Store<ApiPromise | null>;
};

export const createFeeCalculator = ({ $active = createStore(true), $transaction, $api }: Params) => {
  type RequestParams = {
    api: ApiPromise;
    transaction: Transaction;
    signerOptions?: Partial<SignerOptions>;
  };

  const $source = combine({ transaction: $transaction, api: $api }, ({ transaction, api }) => {
    if (nullable(transaction) || nullable(api)) return null;

    return { transaction, api };
  });

  const $fee = createStore(BN_ZERO);

  const fetchFeeFx = createEffect(({ api, transaction, signerOptions }: RequestParams) => {
    return transactionService.getTransactionFee(transaction, api, signerOptions).then((x) => new BN(x));
  });

  const $pending = restore(fetchFeeFx.pending.updates, true);

  const logErrorFx = createEffect((res: UnitValue<typeof fetchFeeFx.fail>) => {
    console.error('fee calculation faied', res);
  });

  sample({
    clock: $source,
    filter: nullable,
    fn: () => BN_ZERO,
    target: $fee,
  });

  const feeRequested = sample({
    clock: [$source.updates, $active.updates],
    source: { active: $active, source: $source },
  }).filterMap(({ active, source }) => {
    if (!active) return undefined;
    if (source) return source;
  });

  sample({
    clock: feeRequested,
    target: fetchFeeFx,
  });

  sample({
    clock: fetchFeeFx.doneData,
    source: $transaction,
    filter: nonNullable,
    fn: (_, fee) => fee,
    target: $fee,
  });

  sample({
    clock: fetchFeeFx.fail,
    source: $transaction,
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
