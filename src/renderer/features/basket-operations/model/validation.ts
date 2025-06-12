import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN } from '@polkadot/util';
import { attach, createEffect, createStore, sample } from 'effector';
import { produce } from 'immer';
import { uniq } from 'lodash';

import { type ID } from '@/shared/core';
import { createAsyncPipeline } from '@/shared/di';
import { series } from '@/shared/effector';
import { attachToFeatureInput } from '@/shared/feature';
import { nonNullable, nullable, transferableAmountBN } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionService } from '@/entities/transaction';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { type ValidationResult } from '@/features/operations/OperationsValidation';

import { basketOperationsFeature } from './feature';
import { list } from './list';

export type ValidationParams = {
  transaction: BasketTransaction;
  signerOptions?: Partial<SignerOptions>;
};

const validationAsyncPipeline = createAsyncPipeline<NonNullable<ValidationResult>[], ValidationParams>();

const $pending = createStore<Record<ID, boolean>>({});
const $validatingResults = createStore<Record<ID, NonNullable<ValidationResult>[]>>({});

const validateFeeFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balances,
  },
  async effect({ chains, apis, balances }, { transaction, signerOptions }: ValidationParams) {
    const chain = chains[transaction.coreTx.chainId];
    const api = apis[transaction.coreTx.chainId];
    const asset = chain.assets.at(0);

    if (nullable(api) || nullable(chain) || nullable(asset)) throw new Error('Data for validation no found');

    await api.isReady;

    const wrapped = transactionService.getWrappedTransaction({
      api,
      transaction: transaction.coreTx,
      txWrappers: transaction.txWrappers,
    });

    // TODO switch to account traverse
    const transactions = uniq([wrapped.coreTx, wrapped.multisigTx, wrapped.wrappedTx].filter(nonNullable));

    const validations = transactions.map<Promise<ValidationResult>>(async transaction => {
      const accountId = transaction.accountId;
      const fee = await transactionService.getTransactionFee(transaction, api, signerOptions);
      const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId.toString());

      const feeBN = new BN(fee);

      // what should we do when balance is empty?
      if (balance) {
        if (transferableAmountBN(balance).lte(feeBN)) {
          return {
            name: 'insufficientBalanceForFee',
            errorText: 'transfer.notEnoughBalanceForFeeError',
          };
        }
      }
    });

    return Promise.all(validations).then(list => list.filter(nonNullable));
  },
});

const validateTransactionFx = createEffect(async ({ transaction, signerOptions }: ValidationParams) => {
  return validateFeeFx({ transaction, signerOptions }).then(r => {
    return validationAsyncPipeline.apply(r, { transaction, signerOptions });
  });
});

const validateTransactionsFx = series(validateTransactionFx, { parallel: true, skipErrors: true });

sample({
  clock: validateTransactionFx,
  source: $pending,
  fn(pending, { transaction }) {
    return produce(pending, draft => {
      draft[transaction.id] = true;
    });
  },
  target: $pending,
});

sample({
  clock: validateTransactionFx.finally,
  source: $pending,
  fn(pending, { params }) {
    return produce(pending, draft => {
      draft[params.transaction.id] = false;
    });
  },
  target: $pending,
});

sample({
  clock: validateTransactionFx.finally,
  source: $validatingResults,
  fn(results, res) {
    if (res.status === 'done') {
      return {
        ...results,
        [res.params.transaction.id]: res.result,
      };
    } else {
      return {
        ...results,
        [res.params.transaction.id]: [
          {
            name: 'exception',
            errorText: res.error.message ?? '',
          },
        ],
      };
    }
  },
  target: $validatingResults,
});

sample({
  clock: attachToFeatureInput(basketOperationsFeature, list.$all),
  fn({ data: transactions }) {
    return transactions.map(transaction => {
      // TODO pass signerOptions
      return { transaction, signerOptions: undefined };
    });
  },
  target: validateTransactionsFx,
});

const validateAllFx = attach({
  source: list.$all,
  mapParams(_: void, transactions) {
    return transactions.map(transaction => {
      // TODO pass signerOptions
      return { transaction, signerOptions: undefined };
    });
  },
  effect: validateTransactionsFx,
});

export const validation = {
  validationAsyncPipeline,
  $validatingResults,
  $pending,
  validateAll: validateAllFx,
  validateTransaction: validateTransactionFx,
  validateTransactions: validateTransactionsFx,
};
