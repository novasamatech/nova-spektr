import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample, split } from 'effector';
import { delay, throttle } from 'patronum';

import { type BasketTransaction, type ChainId, type ID, TransactionType } from '@shared/core';
import { addUnique, removeFromCollection } from '@shared/lib/utils';

import { basketModel } from '@entities/basket';
import { networkModel, networkUtils } from '@entities/network';
import { TransferTypes, XcmTypes, transactionService } from '@entities/transaction';
import { walletModel } from '@entities/wallet';

import { basketFilterModel } from '@features/basket/BasketFilter';
import {
  type ValidationResult,
  addProxyValidateModel,
  addPureProxiedValidateModel,
  bondExtraValidateModel,
  bondNominateValidateModel,
  nominateValidateModel,
  payeeValidateModel,
  removeProxyValidateModel,
  removePureProxiedValidateModel,
  restakeValidateModel,
  transferValidateModel,
  unstakeValidateModel,
  withdrawValidateModel,
} from '@features/operations/OperationsValidation';

import { basketPageUtils } from '../lib/basket-page-utils';
import { getCoreTx } from '../lib/utils';
import { Step } from '../types/basket-page-types';

import { signOperationsModel } from './sign-operations-model';

type BasketTransactionsMap = {
  valid: BasketTransaction[];
  invalid: BasketTransaction[];
};

type FeeMap = Record<ChainId, Record<TransactionType, string>>;

const txSelected = createEvent<{ id: ID; value: boolean }>();
const txClicked = createEvent<BasketTransaction>();
const allSelected = createEvent();
const signStarted = createEvent();
const validationStarted = createEvent();
const refreshValidationStarted = createEvent();
const signContinued = createEvent();
const signTransactionsReceived = createEvent<BasketTransactionsMap>();
const validationWarningShown = createEvent<BasketTransactionsMap>();
const proceedValidationWarning = createEvent<BasketTransactionsMap>();
const cancelValidationWarning = createEvent();
const removeTxStarted = createEvent<BasketTransaction>();
const removeTxCancelled = createEvent();
const txRemoved = createEvent<BasketTransaction>();
const stepChanged = createEvent<Step>();

const $step = restore(stepChanged, Step.SELECT);
const $selectedTxs = createStore<number[]>([]).reset(walletModel.$activeWallet);
const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map()).reset(walletModel.$activeWallet);
const $validTxs = createStore<BasketTransaction[]>([]);
const $validatingTxs = createStore<number[]>([]);
const $validationWarningShown = createStore<boolean>(false);
const $alreadyValidatedTxs = createStore<number[]>([]).reset(walletModel.$activeWallet);
const $txToRemove = restore(removeTxStarted, null).reset([removeTxCancelled, txRemoved]);
const $feeMap = createStore<FeeMap>({}).reset(walletModel.$activeWallet);
const $connectedChains = createStore('');

const getFeeMapFx = createEffect(
  async ({
    transactions,
    apis,
    feeMap,
  }: {
    transactions: BasketTransaction[];
    apis: Record<ChainId, ApiPromise>;
    feeMap: FeeMap;
  }) => {
    const newFeeMap: FeeMap = { ...feeMap };

    for (const transaction of transactions) {
      const chainId = transaction.coreTx.chainId;
      const api = apis[chainId];

      if (!api) continue;

      const transactionType = basketPageUtils.getTransactionType(transaction);

      if (!newFeeMap[chainId]) newFeeMap[chainId] = {} as Record<TransactionType, string>;

      if (newFeeMap[chainId][transactionType]) continue;

      newFeeMap[chainId][transactionType] = await transactionService.getTransactionFee(transaction.coreTx, api);
    }

    return newFeeMap;
  },
);

type ValidateParams = { transactions: BasketTransaction[]; feeMap: FeeMap };

const validateFx = createEffect(({ transactions, feeMap }: ValidateParams) => {
  for (const tx of transactions) {
    const coreTx = getCoreTx(tx, [TransactionType.BOND, TransactionType.UNSTAKE]);

    if (TransferTypes.includes(coreTx.type) || XcmTypes.includes(coreTx.type)) {
      transferValidateModel.events.validationStarted({
        id: tx.id,
        transaction: coreTx,
        feeMap,
      });
    }

    const TransactionValidators = {
      [TransactionType.ADD_PROXY]: addProxyValidateModel.events.validationStarted,
      [TransactionType.CREATE_PURE_PROXY]: addPureProxiedValidateModel.events.validationStarted,
      [TransactionType.REMOVE_PROXY]: removeProxyValidateModel.events.validationStarted,
      [TransactionType.REMOVE_PURE_PROXY]: removePureProxiedValidateModel.events.validationStarted,
      [TransactionType.BOND]: bondNominateValidateModel.events.validationStarted,
      [TransactionType.NOMINATE]: nominateValidateModel.events.validationStarted,
      [TransactionType.STAKE_MORE]: bondExtraValidateModel.events.validationStarted,
      [TransactionType.DESTINATION]: payeeValidateModel.events.validationStarted,
      [TransactionType.RESTAKE]: restakeValidateModel.events.validationStarted,
      [TransactionType.UNSTAKE]: unstakeValidateModel.events.validationStarted,
      [TransactionType.REDEEM]: withdrawValidateModel.events.validationStarted,
    };

    if (coreTx.type in TransactionValidators) {
      // @ts-expect-error TS thinks that transfer should be in TransactionValidators
      TransactionValidators[coreTx.type]({
        id: tx.id,
        transaction: coreTx,
        feeMap,
      });
    }
  }
});

const $basketTransactions = combine(
  {
    wallet: walletModel.$activeWallet,
    basket: basketModel.$basket,
  },
  ({ wallet, basket }) => basket.filter((tx) => tx.initiatorWallet === wallet?.id).reverse(),
);

const txValidated = [
  transferValidateModel.output.txValidated,
  addProxyValidateModel.output.txValidated,
  addPureProxiedValidateModel.output.txValidated,
  removeProxyValidateModel.output.txValidated,
  removePureProxiedValidateModel.output.txValidated,
  bondNominateValidateModel.output.txValidated,
  nominateValidateModel.output.txValidated,
  bondExtraValidateModel.output.txValidated,
  payeeValidateModel.output.txValidated,
  restakeValidateModel.output.txValidated,
  unstakeValidateModel.output.txValidated,
  withdrawValidateModel.output.txValidated,
];

sample({
  clock: throttle(networkModel.$connectionStatuses, 2000),
  source: {
    statuses: networkModel.$connectionStatuses,
    txs: $basketTransactions,
  },
  fn: ({ statuses, txs }) =>
    [...new Set(txs.map((tx) => tx.coreTx.chainId))]
      .filter((chainId) => {
        return networkUtils.isConnectedStatus(statuses[chainId]);
      })
      .join(' '),
  target: $connectedChains,
});

sample({
  clock: txSelected,
  source: $selectedTxs,
  fn: (selectedTxs, { id, value }) => {
    return value ? addUnique(selectedTxs, id) : removeFromCollection(selectedTxs, id);
  },
  target: $selectedTxs,
});

sample({
  clock: $basketTransactions,
  source: $selectedTxs,
  fn: (selectedTxs, txs) => selectedTxs.filter((id) => txs.find((tx) => tx.id === id)),
  target: $selectedTxs,
});

sample({
  clock: [$connectedChains, $basketTransactions],
  source: { apis: networkModel.$apis, transactions: $basketTransactions, feeMap: $feeMap },
  fn: ({ apis, transactions, feeMap }) => ({ apis, transactions, feeMap }),
  target: getFeeMapFx,
});

sample({
  clock: getFeeMapFx.doneData,
  target: $feeMap,
});

sample({
  clock: $invalidTxs,
  fn: (invalidTxs) => [...invalidTxs.keys()],
  target: basketFilterModel.events.invalidTxsSet,
});

sample({
  clock: allSelected,
  source: {
    txs: basketFilterModel.$filteredTxs,
    selectedTxs: $selectedTxs,
    invalidTxs: $invalidTxs,
    validatingTxs: $validatingTxs,
    alreadyValidatedTxs: $alreadyValidatedTxs,
  },
  fn: ({ txs, selectedTxs, invalidTxs, validatingTxs, alreadyValidatedTxs }) => {
    const validTxs = txs.filter(
      (tx) => !invalidTxs.has(tx.id) && !(validatingTxs.includes(tx.id) || !alreadyValidatedTxs.includes(tx.id)),
    );

    return selectedTxs.length >= validTxs.length ? [] : validTxs.map((tx) => tx.id);
  },
  target: $selectedTxs,
});

sample({
  clock: [
    $connectedChains,
    // HOOK: delay to wait until update balances for new wallet
    delay($basketTransactions, 1000),
  ],
  target: validationStarted,
});

sample({
  clock: validationStarted,
  source: {
    transactions: $basketTransactions,
    apis: networkModel.$apis,
    alreadyValidatedTxs: $alreadyValidatedTxs,
    validatingTxs: $validatingTxs,
    feeMap: $feeMap,
  },
  fn: ({ transactions, apis, alreadyValidatedTxs, validatingTxs, feeMap }) => {
    const chains = new Set(transactions.map((t) => t.coreTx.chainId));
    const txsToValidate = [...chains].reduce<BasketTransaction[]>((acc, chainId) => {
      if (!apis[chainId]) {
        return acc;
      }

      const txs = transactions
        .filter((tx) => tx.coreTx.chainId === chainId)
        .filter((tx) => !alreadyValidatedTxs.includes(tx.id) && !validatingTxs.includes(tx.id));

      return [...acc, ...txs];
    }, []);

    return {
      transactions: txsToValidate,
      feeMap,
    };
  },
  target: validateFx,
});

sample({
  clock: refreshValidationStarted,
  source: {
    transactions: $basketTransactions,
    apis: networkModel.$apis,
    feeMap: $feeMap,
  },
  fn: ({ transactions, apis, feeMap }) => {
    const chains = new Set(transactions.map((t) => t.coreTx.chainId));

    const txsToValidate = [...chains].reduce<BasketTransaction[]>((acc, chainId) => {
      if (!apis[chainId]) {
        return acc;
      }

      const txs = transactions.filter((tx) => tx.coreTx.chainId === chainId);

      return [...acc, ...txs];
    }, []);

    return {
      transactions: txsToValidate,
      feeMap,
    };
  },
  target: validateFx,
});

sample({
  clock: validateFx,
  source: $validatingTxs,
  fn: (validatingTxs, { transactions }) => transactions.reduce((acc, tx) => addUnique(acc, tx.id), validatingTxs),
  target: $validatingTxs,
});

sample({
  clock: txValidated,
  source: $invalidTxs,
  fn: (txs, { id, result }) => {
    const invalidTxs = new Map(txs);

    if (!result) {
      invalidTxs.delete(id);
    } else {
      invalidTxs.set(id, result);
    }

    return invalidTxs;
  },

  target: $invalidTxs,
});

// Validation on sign process

sample({
  clock: txValidated,
  source: $validatingTxs,
  fn: (txs, { id }) => removeFromCollection(txs, id),
  target: $validatingTxs,
});

sample({
  clock: txValidated,
  source: $alreadyValidatedTxs,
  fn: (txs, { id }) => addUnique(txs, id),
  target: $alreadyValidatedTxs,
});

sample({
  clock: txClicked,
  fn: (transaction) => [transaction.id],
  target: $selectedTxs,
});

sample({
  clock: signStarted,
  fn: () => Step.SIGN,
  target: stepChanged,
});

sample({
  clock: txClicked,
  fn: (transaction) => [transaction],
  target: signStarted,
});

sample({
  clock: signStarted,
  source: {
    allTransactions: $basketTransactions,
    selectedTxs: $selectedTxs,
    invalidTxs: $invalidTxs,
    feeMap: $feeMap,
  },
  fn: ({ allTransactions, selectedTxs, feeMap }) => ({
    transactions: allTransactions.filter((t) => selectedTxs.includes(t.id)),
    feeMap,
  }),
  target: validateFx,
});

sample({
  clock: $validatingTxs,
  source: {
    step: $step,
    validatingTxs: $validatingTxs,
    selectedTxs: $selectedTxs,
  },
  filter: ({ step, validatingTxs, selectedTxs }) => {
    return basketPageUtils.isSignStep(step) && selectedTxs.filter((tx) => validatingTxs.includes(tx)).length === 0;
  },
  target: signContinued,
});

sample({
  clock: signContinued,
  source: { allTransactions: $basketTransactions, selectedTxs: $selectedTxs, invalidTxs: $invalidTxs },
  fn: ({ allTransactions, selectedTxs, invalidTxs }) => {
    const filteredTxs = allTransactions.filter((t) => selectedTxs.includes(t.id));

    return filteredTxs.reduce(
      (acc, tx) => {
        if (invalidTxs.has(tx.id)) {
          acc.invalid.push(tx);
        } else {
          acc.valid.push(tx);
        }

        return acc;
      },
      {
        valid: [] as BasketTransaction[],
        invalid: [] as BasketTransaction[],
      },
    );
  },
  target: signTransactionsReceived,
});

split({
  source: signTransactionsReceived,
  match: {
    invalid: ({ invalid }) => {
      return invalid.length > 0;
    },
  },
  cases: {
    invalid: validationWarningShown,
    __: proceedValidationWarning,
  },
});

sample({
  clock: validationWarningShown,
  fn: () => true,
  target: $validationWarningShown,
});

sample({
  clock: validationWarningShown,
  fn: ({ valid }) => valid,
  target: $validTxs,
});

sample({
  clock: proceedValidationWarning,
  fn: ({ valid }) => {
    return valid;
  },
  target: $validTxs,
});

sample({
  clock: proceedValidationWarning,
  source: $feeMap,
  fn: (feeMap, { valid }) => {
    return {
      transactions: valid,
      feeMap,
    };
  },
  target: signOperationsModel.events.flowStarted,
});

sample({
  clock: [cancelValidationWarning, proceedValidationWarning],
  fn: () => false,
  target: $validationWarningShown,
});

sample({
  clock: txRemoved,
  fn: (tx) => [tx],
  target: basketModel.events.transactionsRemoved,
});

sample({
  clock: signOperationsModel.output.flowFinished,
  fn: () => Step.SELECT,
  target: stepChanged,
});

sample({
  clock: walletModel.events.walletRemovedSuccess,
  source: basketModel.$basket,
  fn: (txs, { params }) => txs.filter((t) => t.initiatorWallet === params.id),
  target: basketModel.events.transactionsRemoved,
});

export const basketPageModel = {
  $basketTransactions,
  $selectedTxs,
  $invalidTxs,
  $validTxs,
  $validationWarningShown,
  $validatingTxs,
  $txToRemove,
  $alreadyValidatedTxs,
  $step,

  events: {
    refreshValidationStarted,
    txSelected,
    txClicked,
    allSelected,
    signStarted,
    cancelValidationWarning,
    proceedValidationWarning,
    stepChanged,

    removeTxStarted,
    removeTxCancelled,
    txRemoved,

    selectedTxsReset: $selectedTxs.reinit,
  },
};
