import { type ApiPromise } from '@polkadot/api';
import { type SignerOptions } from '@polkadot/api/submittable/types';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createStore, sample } from 'effector';
import { t } from 'i18next';
import { produce } from 'immer';
import { throttle } from 'patronum';

import { type ID, ConnectionStatus } from '@/shared/core';
import { createAsyncPipeline } from '@/shared/di';
import { series } from '@/shared/effector';
import { nullable, transferableAmountBN } from '@/shared/lib/utils';
import { transactionService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { getExtrinsic } from '@/entities/transaction';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { type ValidationResult } from '@/features/operations/OperationsValidation';

import { list } from './list';

export type ValidationParams = {
  transaction: BasketTransaction;
  signerOptions?: Partial<SignerOptions>;
  api: ApiPromise;
};

const validationAsyncPipeline = createAsyncPipeline<NonNullable<ValidationResult>[], ValidationParams>();

const $pending = createStore<Record<ID, boolean>>({});
const $validatingResults = createStore<Record<ID, NonNullable<ValidationResult>[]>>({});

const $chainsFromList = list.$all.map(transactions => {
  return new Set(
    transactions.map(transaction => {
      return transaction.coreTx.chainId;
    }),
  );
});

const $apisFromChainsListConnected = combine(
  {
    chainsFromList: $chainsFromList,
    chains: networkModel.$chains,
    connectionStatuses: networkModel.$connectionStatuses,
  },
  ({ chainsFromList, chains, connectionStatuses }) => {
    if (chainsFromList.size === 0) return false;

    const neededChains = Object.values(chains).filter(chain => {
      return chainsFromList.has(chain.chainId);
    });

    return neededChains.every(chain => {
      return connectionStatuses[chain.chainId] === ConnectionStatus.CONNECTED;
    });
  },
);

const validateFeeFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
    balances: balanceModel.$balanceMap,
  },
  async effect({ chains, apis, balances }, { transaction }: ValidationParams) {
    const chain = chains[transaction.coreTx.chainId];
    const api = apis[transaction.coreTx.chainId];
    const asset = chain?.assets.at(0);

    if (nullable(api) || nullable(chain) || nullable(asset)) throw new Error('Data for validation no found');

    await api.isReady;

    const wrapped = await transactionService.wrapLegacyTransaction(transaction.coreTx, transaction.route, api);
    const extrinsic = getExtrinsic[wrapped.type](wrapped.args, api);

    const accountId = wrapped.accountId;
    const fee = await transactionService.getExtrinsicFee(extrinsic);
    const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);

    const feeBN = new BN(fee);

    // what should we do when balance is empty?
    if (balance) {
      if (transferableAmountBN(balance).lte(feeBN)) {
        return [
          {
            name: 'insufficientBalanceForFee',
            errorText: t('transfer.notEnoughBalanceForFeeError'),
          },
        ];
      }
    }

    return [];
  },
});

const validateTransactionFx = createEffect(async ({ transaction, signerOptions, api }: ValidationParams) => {
  return validateFeeFx({ transaction, signerOptions, api }).then(r => {
    return validationAsyncPipeline.apply(r, { transaction, signerOptions, api });
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
  clock: [throttle($apisFromChainsListConnected, 500), list.$all],
  source: { list: list.$all, apisFromChainsListConnected: $apisFromChainsListConnected, apis: networkModel.$apis },
  filter: ({ apisFromChainsListConnected, list }) => apisFromChainsListConnected && list.length > 0,
  fn({ list, apis }) {
    return list.map(transaction => {
      const api = apis[transaction.coreTx.chainId]!;
      // TODO pass signerOptions
      return { transaction, api, signerOptions: undefined };
    });
  },
  target: validateTransactionsFx,
});

const validateAllFx = attach({
  source: { list: list.$all, apis: networkModel.$apis },
  mapParams(_: void, { list, apis }) {
    return list.map(transaction => {
      const api = apis[transaction.coreTx.chainId]!;
      return { transaction, api, signerOptions: undefined };
    });
  },
  effect: validateTransactionsFx,
});

export const validation = {
  validationAsyncPipeline,
  $validatingResults,
  $apisFromChainsListConnected,
  $pending,
  validateAll: validateAllFx,
  validateTransaction: validateTransactionFx,
  validateTransactions: validateTransactionsFx,
};
