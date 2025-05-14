import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEffect, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Chain, type Transaction } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { type AnyAccount, accountService, transactionService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { createFeeCalculator } from './createFeeCalculator';

type Params<T extends Transaction> = {
  active?: Store<boolean>;
  api: Store<ApiPromise | null>;
  chain: Store<Chain | null>;
  transaction: Store<T | null>;
  accounts: Store<AnyAccount[]>;
  initiator: Store<AnyAccount | null>;
  signatory: Store<AnyAccount | null>;
};

export const createComplexTxStore = <T extends Transaction>({
  active = createStore(true),
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
    return [];
  });

  const $tx = createStore<Transaction | null>(null);
  /**
   * @deprecated Legacy bindings for multisig saving after operation success
   *
   * @see src/renderer/features/operations/OperationSubmit/model/submit-model.ts#28
   */
  const $multisigTx = createStore<Transaction | null>(null);

  type WrapParams = {
    api: ApiPromise;
    transaction: T;
    route: AnyAccount[];
  };

  const wrapTransactionFx = createEffect(async ({ transaction, route, api }: WrapParams) => {
    const tx = await transactionService.wrapLegacyTransaction(transaction, route, api);

    const mutisigAccountIndex = route.findIndex(accountUtils.isMultisigAccount);
    if (mutisigAccountIndex !== -1) {
      const multisigTx = await transactionService.wrapLegacyTransaction(
        transaction,
        route.slice(mutisigAccountIndex - 1),
        api,
      );

      return {
        tx,
        multisigTx,
      };
    }

    return {
      tx,
      multisigTx: null,
    };
  });

  const wrapTransaction = sample({
    clock: [transaction, api, $route],
    source: { transaction, api, route: $route },
  }).filter({ fn: nonNullableMap });

  sample({
    clock: wrapTransaction,
    filter: active,
    target: wrapTransactionFx,
  });

  sample({
    clock: active,
    filter: (active) => !active,
    fn: () => null,
    target: [$tx, $multisigTx],
  });

  sample({
    clock: wrapTransactionFx.doneData,
    target: spread({
      tx: $tx,
      multisigTx: $multisigTx,
    }),
  });

  const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
    $active: active,
    $api: api,
    $transaction: $tx,
  });

  return {
    $route,
    $tx,
    $multisigTx,
    $pendingWrapping: wrapTransactionFx.pending,
    $fee,
    $pendingFee,
  };
};
