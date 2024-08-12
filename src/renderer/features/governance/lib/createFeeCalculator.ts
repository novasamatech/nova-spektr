import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/types/submittable';
import { BN, BN_ZERO } from '@polkadot/util';
import { type Store, combine, createEffect, createEvent, createStore, sample, split } from 'effector';
import { spread } from 'patronum';

import { type Transaction } from '@shared/core';
import { transactionService } from '@entities/transaction';

type Params = {
  $transaction: Store<Transaction | null>;
  $api: Store<ApiPromise | null>;
};

// TODO discuss api for factories
export const createFeeCalculator = ({ $transaction, $api }: Params) => {
  type RequestParams = {
    api: ApiPromise;
    transaction: Transaction;
    signerOptions?: Partial<SignerOptions>;
  };

  const $fee = createStore<BN>(BN_ZERO);
  const $dropped = createStore(false);

  const fetchFee = createEvent<{ api: ApiPromise | null; transaction: Transaction | null }>();
  const dropFee = createEvent();

  const fetchFeeFx = createEffect(({ api, transaction, signerOptions }: RequestParams) => {
    return transactionService.getTransactionFee(transaction, api, signerOptions).then((x) => new BN(x));
  });

  const $source = combine({ transaction: $transaction, api: $api });

  split({
    source: $source,
    match: {
      request: ({ transaction, api }) => !!transaction && !!api,
      drop: ({ transaction, api }) => !transaction || !api,
    },
    cases: {
      request: fetchFee,
      drop: dropFee,
    },
  });

  sample({
    clock: fetchFee,
    fn: () => false,
    target: $dropped,
  });

  sample({
    clock: fetchFee,
    source: {
      pending: fetchFeeFx.pending,
      // dropped: $dropped,
    },
    filter: ({ pending }, { transaction, api }) => !pending && !!transaction && !!api,
    fn: (_, { transaction, api }) => ({
      transaction: transaction!,
      api: api!,
    }),
    target: fetchFeeFx,
  });

  sample({
    clock: dropFee,
    fn: () => ({ fee: BN_ZERO, dropped: true }),
    target: spread({
      fee: $fee,
      dropped: $dropped,
    }),
  });

  sample({
    clock: fetchFeeFx.doneData,
    target: $fee,
  });

  return { $: $fee, $pending: fetchFeeFx.pending, drop: dropFee };
};
