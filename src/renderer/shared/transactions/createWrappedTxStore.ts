import { type ApiPromise } from '@polkadot/api';
import { type Store, createEffect, createEvent, createStore, sample } from 'effector';

import { nonNullableMap, nullable } from '@/shared/lib/utils';
import { type AnyAccount, type AnyTransaction, transactionService } from '@/domains/network';

type Params = {
  api: Store<ApiPromise | null>;
  transaction: Store<AnyTransaction | null>;
  route: Store<AnyAccount[]>;
};

export const createWrappedTxStore = ({ api, transaction, route }: Params) => {
  const $tx = createStore<AnyTransaction | null>(null);
  const $error = createStore<Error | null>(null);
  const retry = createEvent();

  type WrapParams = {
    api: ApiPromise;
    transaction: AnyTransaction;
    route: AnyAccount[];
  };

  const wrapTransactionHandler = async ({ transaction, route, api }: WrapParams) => {
    return transactionService.wrapTransaction(transaction, route, api);
  };

  const wrapTransactionFx = createEffect(wrapTransactionHandler);

  const wrapTransaction = sample({
    clock: [transaction, api, route, retry],
    source: { transaction, api, route: route },
  }).filter({ fn: nonNullableMap });

  sample({
    clock: wrapTransaction,
    target: wrapTransactionFx,
  });

  sample({
    clock: transaction,
    filter: (t) => nullable(t),
    fn: () => null,
    target: $tx,
  });

  sample({
    clock: wrapTransactionFx.doneData,
    target: $tx,
  });

  // Without this the store keeps a stale wrapped tx after a failed retry, which
  // would let the user sign a transaction built from outdated inputs.
  sample({
    clock: wrapTransactionFx.fail,
    fn: () => null,
    target: $tx,
  });

  $error.on(wrapTransactionFx.failData, (_, error) => error).reset(wrapTransactionFx.done, retry);

  return {
    $tx,
    $error,
    $pending: wrapTransactionFx.pending,
    retry,
  };
};
