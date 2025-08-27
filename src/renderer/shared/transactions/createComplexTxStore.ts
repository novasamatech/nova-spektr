import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEffect, createStore, sample } from 'effector';

import { type Chain, type Transaction } from '@/shared/core';
import { assert, nonNullable, nonNullableMap, nullable } from '@/shared/lib/utils';
import { type AnyAccount, transactionService } from '@/domains/network';
import { getExtrinsic } from '@/entities/transaction';

import { createFeeCalculator } from './createFeeCalculator';
import { createRouteStore } from './createRouteStore';

type Params<T extends Transaction> = {
  active?: Store<boolean>;
  api: Store<ApiPromise | null>;
  chain: Store<Chain | null>;
  transaction: Store<T | null>;
  feeTransaction?: Store<T | null>;
  accounts: Store<AnyAccount[]>;
  initiator: Store<AnyAccount | null>;
  signatory: Store<AnyAccount | null>;
};

export const createComplexTxStore = <T extends Transaction>({
  active = createStore(true),
  api,
  chain,
  transaction,
  feeTransaction,
  accounts,
  initiator,
  signatory,
}: Params<T>) => {
  const $route = createRouteStore({ accounts, initiator, signatory, chain });

  const $tx = createStore<Transaction | null>(null);
  const $feeTx = createStore<Transaction | null>(null);

  type WrapParams = {
    api: ApiPromise;
    transaction: T;
    route: AnyAccount[];
  };

  const wrapLegacyTransactionHandler = async ({ transaction, route, api }: WrapParams) => {
    const tx = await transactionService.wrapLegacyTransaction(transaction, route, api);
    const signatory = route.at(-1);

    assert(signatory, 'Signatory is required');

    // its a legacy transaction structure which includes unnecessary information about signator
    // we should set signatory explicitly
    tx.accountId = signatory.accountId;

    return tx;
  };

  const wrapTransactionFx = createEffect(wrapLegacyTransactionHandler);
  const wrapFeeTransactionFx = createEffect(wrapLegacyTransactionHandler);

  const wrapTransaction = sample({
    clock: [transaction, api, $route],
    source: { transaction, api, route: $route },
  }).filter({ fn: nonNullableMap });

  sample({
    clock: wrapTransaction,
    filter: active,
    target: wrapTransactionFx,
  });

  if (feeTransaction) {
    const wrapFeeTransaction = sample({
      source: { transaction: feeTransaction, api, route: $route },
      filter: ({ transaction, api, route }) => nonNullable(transaction) && nonNullable(api) && nonNullable(route),
      fn: ({ transaction, api, route }) => ({ transaction: transaction!, api: api!, route: route! }),
    });

    sample({
      clock: wrapFeeTransaction,
      filter: active,
      target: wrapFeeTransactionFx,
    });

    sample({
      clock: wrapFeeTransactionFx.doneData,
      target: $feeTx,
    });
  }

  sample({
    clock: transaction,
    filter: (t) => nullable(t),
    fn: () => null,
    target: $tx,
  });

  sample({
    clock: active,
    filter: (active) => !active,
    fn: () => null,
    target: $tx,
  });

  sample({
    clock: wrapTransactionFx.doneData,
    target: $tx,
  });

  const $mergedTx = combine($tx, $feeTx, (tx, feeTx) => tx || feeTx);

  const $mergedExtrinsic = combine(api, $mergedTx, (api, tx) => {
    if (nullable(api)) return null;
    if (nullable(tx)) return null;
    return getExtrinsic[tx.type](tx.args, api);
  });

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    active,
    extrinsic: $mergedExtrinsic,
  });

  return {
    $route,
    $tx,
    $feeTx,
    $pendingWrapping: wrapTransactionFx.pending,
    $fee,
    $pendingFee,
  };
};
