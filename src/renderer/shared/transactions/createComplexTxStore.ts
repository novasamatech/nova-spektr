import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEffect, createStore, sample } from 'effector';

import { type Chain, type Transaction } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { type AnyAccount, accountService, transactionService } from '@/domains/network';

import { createFeeCalculator } from './createFeeCalculator';

type Params<T extends Transaction> = {
  active: Store<boolean>;
  api: Store<ApiPromise | null>;
  chain: Store<Chain | null>;
  transaction: Store<T | null>;
  accounts: Store<AnyAccount[]>;
  initiator: Store<AnyAccount | null>;
  signatory: Store<AnyAccount | null>;
};

export const createComplexTxStore = <T extends Transaction>({
  active,
  api,
  chain,
  transaction,
  accounts,
  initiator,
  signatory,
}: Params<T>) => {
  const $route = combine({ accounts, initiator, signatory, chain }, (params) => {
    if (nonNullableMap(params)) {
      return accountService.findRoute(params.initiator, params.signatory, params.accounts, params.chain);
    }
  });

  const $wrappedTransaction = createStore<Transaction | null>(null);

  type WrapParams = {
    api: ApiPromise;
    transaction: T;
    route: AnyAccount[];
  };

  const wrapTransactionFx = createEffect(async ({ transaction, route, api }: WrapParams) => {
    return transactionService.wrapLegacyTransaction(transaction, route, api);
  });

  sample({
    clock: [transaction, api, $route],
    source: { transaction, api, route: $route },
    filter: nonNullableMap,
    target: wrapTransactionFx,
  });

  sample({
    clock: wrapTransactionFx.doneData,
    target: $wrappedTransaction,
  });

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    $active: active,
    $api: api,
    $transaction: $wrappedTransaction,
  });

  return {
    $wrappedTransaction,
    $pendingWrapping: wrapTransactionFx.pending,
    $fee,
    $pendingFee,
  };
};
