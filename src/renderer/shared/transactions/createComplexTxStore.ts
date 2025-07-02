import { type ApiPromise } from '@polkadot/api';
import { type Store, combine, createEffect, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Chain, type Transaction } from '@/shared/core';
import { assert, nonNullableMap, nullable } from '@/shared/lib/utils';
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

  // VALENTIN REVIEW: it is hard to follow the code because it is hard to understand what is the order of the accounts in the route
  //
  // I think this can be mitigated by introducing a set of utility functions that hide index-based operations
  // for example: getSubmissionAccount, getExecutingAccount
  // It is also hard to understand whether accountIndex - 1 refers to outer origin or the inner one
  // similarly, this can be mitigated by some utility function
  // Overall, it feels like we should establish a clear terminology that will eliminate confusion once and for all
  // Maybe we can use controller / controlled terminology, like multisig is controlled by signaotry, signatory controlls multisig
  // Given that, I think the best way to work with the route is fixed structure like
  type CasRoute = {
    segments: CasRouteSegment[]
  }

  type CasRouteSegment = {
    index: number;
    account: AnyAccount
  }

  // And then we can do util functions like (indicies assume submission account is the first one, the execution account is the last one)

  function getControllerOf(segment: CasRouteSegment, route: CasRoute): CasRouteSegment | null {
    if (segment.index == 0) return null;

    return route.segments[segment.index - 1];
  }

  function getControlledAccountBy(segment: CasRouteSegment, route: CasRoute): CasRouteSegment | null {
    if (segment.index == route.segments.length - 1) return null

    return route.segments[segment.index + 1];
  }

  function getSubmissionAccount(route: CasRoute): CasRouteSegment {
    return route.segments[0]
  }

  function getExecutionAccount(route: CasRoute): CasRouteSegment | null {
    return route.segments[1]
  }

  // The naming might be different but I hope the overall idea is clear
  // END VALENTIN REVIEW

  const wrapTransactionFx = createEffect(async ({ transaction, route, api }: WrapParams) => {
    const tx = await transactionService.wrapLegacyTransaction(transaction, route, api);
    // VALENTIN REVIEW: "signatory" is confusing naming
    const signatory = route.at(-1);

    assert(signatory, 'Signatory is required');

    // its a legacy transaction structure which includes unnecessary information about signator
    // we should set signatory explicitly
    tx.accountId = signatory.accountId;

    // VALENTIN REVIEW: In case of multiple multisig in the sequence, are we sure it finds the right one?
    const mutisigAccountIndex = route.findIndex(accountUtils.isMultisigAccount);
    if (mutisigAccountIndex !== -1) {
      // VALENTIN REVIEW: this whole branch looks sketchy - what if the multisig is not top-most account?
      const multisigTx = await transactionService.wrapLegacyTransaction(
        transaction,
        route.slice(mutisigAccountIndex - 1),
        api,
      );

      multisigTx.accountId = signatory.accountId;

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
    clock: transaction,
    filter: (t) => nullable(t),
    fn: () => null,
    target: $tx,
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
