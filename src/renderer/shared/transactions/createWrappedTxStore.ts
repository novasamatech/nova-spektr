import { type ApiPromise } from '@polkadot/api';
import { type Store, type UnitValue, createEvent, createStore, sample } from 'effector';

import { takeLast } from '@/shared/effector';
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

  // Wrapping is not idempotent-safe to run concurrently: it awaits a live RPC call
  // (paymentInfo) that can hang for tens of seconds, so a stale run can still be
  // in flight when a newer one (retry, or api/route settling) starts. takeLast
  // aborts the previous run's outcome (success or failure) so it can never
  // overwrite state set by a newer run.
  const wrapTransactionFx = takeLast({
    fn: wrapTransactionHandler,
    key: () => 'wrapTransaction',
  });

  const isAbortError = (err: UnitValue<typeof wrapTransactionFx.failData>) =>
    err && 'name' in err && err.name === 'AbortError';

  const wrapTransaction = sample({
    clock: [transaction, api, route, retry],
    source: { transaction, api, route: route },
  }).filter({ fn: nonNullableMap });

  sample({
    clock: wrapTransaction,
    target: wrapTransactionFx,
  });

  // Clearing the transaction ends the attempt outright — the flow closed, or its
  // inputs went away.
  const transactionCleared = sample({ clock: transaction, filter: (t) => nullable(t) });

  sample({
    clock: transactionCleared,
    fn: () => null,
    target: $tx,
  });

  sample({
    clock: wrapTransactionFx.doneData,
    target: $tx,
  });

  // Without this the store keeps a stale wrapped tx after a failed re-wrap, which
  // would let the user sign a transaction built from outdated inputs. AbortError is
  // filtered out because it marks a run superseded by takeLast, not a real failure.
  sample({
    clock: wrapTransactionFx.failData,
    filter: (error) => !isAbortError(error),
    fn: () => null,
    target: $tx,
  });

  sample({
    clock: wrapTransactionFx.failData,
    filter: (error) => !isAbortError(error),
    target: $error,
  });

  // The error dies with the attempt it describes, on both of the ways an attempt can
  // end: superseded by a new call, or cleared outright. Resetting only on `.done` left
  // the failure readable for the whole gap until a new wrap landed — long enough for
  // the next flow to open and read last time's failure, and a rejection is reported
  // immediately, held back by no settle delay. `transactionCleared` is what covers the
  // gap a call-only reset leaves: a flow that reopens before its inputs are complete
  // never calls the effect at all.
  $error.reset(wrapTransactionFx, retry, transactionCleared);

  return {
    $tx,
    $error,
    $pending: wrapTransactionFx.pending,
    retry,
  };
};
