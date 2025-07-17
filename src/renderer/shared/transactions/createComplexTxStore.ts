import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEffect, createStore, sample } from 'effector';

import { type Chain, type Transaction } from '@/shared/core';
import { assert, nonNullableMap, nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService, transactionService } from '@/domains/network';

import { createFeeCalculator } from './createFeeCalculator';

type Params<T extends Transaction> = {
  active?: Store<boolean>;
  api: Store<ApiPromise | null>;
  chain: Store<Chain | null>;
  transaction: Store<T | null>;
  feeTx?: Store<T | null>;
  accounts: Store<AnyAccount[]>;
  initiator: Store<AnyAccount | null>;
  signatory: Store<AnyAccount | null>;
};

export const createComplexTxStore = <T extends Transaction>({
  active = createStore(true),
  api,
  chain,
  transaction,
  feeTx: feeTransaction,
  accounts,
  initiator,
  signatory,
}: Params<T>) => {
  const $route = combine({ accounts, initiator, signatory, chain }, (params) => {
    if (nonNullableMap(params)) {
      return accountService.findRoute(params.initiator, params.signatory, params.accounts, params.chain);
    }
    return [];
  });

  const $tx = createStore<Transaction | null>(null);
  const $feeTx = createStore<Transaction | null>(null);

  type WrapParams = {
    api: ApiPromise;
    transaction: T;
    route: AnyAccount[];
  };

  const wrapTransactionHandler = async ({ transaction, route, api }: WrapParams) => {
    const tx = await transactionService.wrapLegacyTransaction(transaction, route, api);
    const signatory = route.at(-1);

    assert(signatory, 'Signatory is required');

    // its a legacy transaction structure which includes unnecessary information about signator
    // we should set signatory explicitly
    tx.accountId = signatory.accountId;

    return tx;
  };

  const wrapTransactionFx = createEffect(wrapTransactionHandler);
  const wrapFeeTransactionFx = createEffect(wrapTransactionHandler);

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
      clock: [feeTransaction, api, $route],
      source: { transaction: feeTransaction, api, route: $route },
    }).filter({ fn: nonNullableMap });

    sample({
      clock: wrapFeeTransaction,
      filter: active,
      target: wrapFeeTransactionFx,
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

  if (feeTransaction) {
    sample({
      clock: feeTransaction,
      filter: (t) => nullable(t),
      fn: () => null,
      target: $feeTx,
    });

    sample({
      clock: active,
      filter: (active) => !active,
      fn: () => null,
      target: $feeTx,
    });

    sample({
      clock: wrapFeeTransactionFx.doneData,
      target: $feeTx,
    });
  }

  const $mergedTx = combine({ tx: $tx, feeTx: $feeTx }, ({ tx, feeTx }) => {
    return tx || feeTx;
  });

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    $active: active,
    $api: api,
    $transaction: $mergedTx,
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
