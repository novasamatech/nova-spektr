import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/types/submittable';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, combine, createEffect, createStore, sample } from 'effector';

import { type Transaction } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { transactionService } from '@/entities/transaction';

type Params = {
  $transaction: Store<Transaction | null>;
  $api: Store<ApiPromise | null>;
};

export const createFeeCalculator = ({ $transaction, $api }: Params) => {
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

  sample({
    clock: $source,
    filter: nullable,
    fn: () => BN_ZERO,
    target: $fee,
  });

  sample({
    clock: $source,
    filter: nonNullable,
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

  return { $: $fee, $pending: fetchFeeFx.pending };
};
