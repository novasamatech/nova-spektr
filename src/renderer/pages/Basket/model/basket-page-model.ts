import { combine, createEffect, createEvent, createStore, sample, split } from 'effector';
import { once } from 'patronum';

import { networkModel } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { basketModel } from '@entities/basket';
import { BasketTransaction, ID, TransactionType } from '@shared/core';
import { TransferTypes, XcmTypes } from '@entities/transaction';
import {
  transferValidateModel,
  addProxyValidateModel,
  addPureProxiedValidateModel,
  removeProxyValidateModel,
  removePureProxiedValidateModel,
  bondNominateValidateModel,
  payeeValidateModel,
  nominateValidateModel,
  bondExtraValidateModel,
  restakeValidateModel,
  unstakeValidateModel,
  withdrawValidateModel,
  ValidationResult,
} from '@features/operations/OperationsValidation';
import { signOperationsModel } from './sign-operations-model';
import { addUnique, removeFromCollection } from '@shared/lib/utils';

type BasketTransactionsMap = {
  valid: BasketTransaction[];
  invalid: BasketTransaction[];
};

const txSelected = createEvent<{ id: ID; value: boolean }>();
const txClicked = createEvent<BasketTransaction>();
const allSelected = createEvent();
const signStarted = createEvent();
const validationCompleted = createEvent();
const signContinued = createEvent();
const signTransactionsReceived = createEvent<BasketTransactionsMap>();
const validationWarningShown = createEvent<BasketTransactionsMap>();
const proceedValidationWarning = createEvent<BasketTransactionsMap>();
const cancelValidationWarning = createEvent();

const $selectedTxs = createStore<number[]>([]);
const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $validTxs = createStore<BasketTransaction[]>([]);
const $validatingTxs = createStore<number[]>([]);
const $validationWarningShown = createStore<boolean>(false);

const validateFx = createEffect((transactions: BasketTransaction[]) => {
  for (const tx of transactions) {
    if (TransferTypes.includes(tx.coreTx.type) || XcmTypes.includes(tx.coreTx.type)) {
      transferValidateModel.events.validationStarted({ id: tx.id, transaction: tx.coreTx });
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

    if (tx.coreTx.type in TransactionValidators) {
      // TS thinks that transfer should be in TransactionValidators
      // @ts-ignore`
      TransactionValidators[tx.coreTx.type]({ id: tx.id, transaction: tx.coreTx });
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

sample({
  clock: txSelected,
  source: $selectedTxs,
  fn: (selectedTxs, { id, value }) => {
    return value ? addUnique(selectedTxs, id) : removeFromCollection(selectedTxs, id);
  },
  target: $selectedTxs,
});

sample({
  clock: allSelected,
  source: {
    txs: $basketTransactions,
    selectedTxs: $selectedTxs,
  },
  fn: ({ txs, selectedTxs }) => {
    return selectedTxs.length === txs.length ? [] : txs.map((tx) => tx.id);
  },
  target: $selectedTxs,
});

sample({
  clock: [$basketTransactions, networkModel.$apis],
  source: {
    transactions: $basketTransactions,
    apis: networkModel.$apis,
  },
  filter: ({ transactions, apis }) => {
    const chains = new Set(transactions.map((t) => t.coreTx.chainId));

    return [...chains].some((chainId) => apis[chainId]);
  },
  fn: ({ transactions }) => transactions,
  target: validateFx,
});

sample({
  clock: [
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
  ],
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
  clock: validateFx,
  fn: (txs) => txs.map((tx) => tx.id),
  target: $validatingTxs,
});

sample({
  clock: [
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
  ],
  source: $validatingTxs,
  fn: (txs, { id }) => {
    return removeFromCollection(txs, id);
  },

  target: $validatingTxs,
});

sample({
  clock: $validatingTxs,
  filter: (txs) => txs.length === 0,
  target: validationCompleted,
});

sample({
  clock: txClicked,
  fn: (transaction) => [transaction.id],
  target: $selectedTxs,
});

sample({
  clock: txClicked,
  fn: (transaction) => [transaction],
  target: signStarted,
});

sample({
  clock: once({
    source: validationCompleted,
    reset: signStarted,
  }),
  target: signContinued,
});

sample({
  clock: signStarted,
  source: { allTransactions: $basketTransactions, selectedTxs: $selectedTxs, invalidTxs: $invalidTxs },
  fn: ({ allTransactions, selectedTxs }) => allTransactions.filter((t) => selectedTxs.includes(t.id)),
  target: validateFx,
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
  target: [$validTxs, signOperationsModel.events.flowStarted],
});

sample({
  clock: [cancelValidationWarning, proceedValidationWarning],
  fn: () => false,
  target: $validationWarningShown,
});

export const basketPageModel = {
  $basketTransactions,
  $selectedTxs,
  $invalidTxs,
  $validTxs,
  $validationWarningShown,
  $validatingTxs,

  events: {
    txSelected,
    txClicked,
    allSelected,
    signStarted,
    cancelValidationWarning,
    proceedValidationWarning,
  },
};
