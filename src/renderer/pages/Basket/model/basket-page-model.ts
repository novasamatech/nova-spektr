import { combine, createEffect, createEvent, createStore, restore, sample, split } from 'effector';

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
import { getCoreTx } from '../lib/utils';

type BasketTransactionsMap = {
  valid: BasketTransaction[];
  invalid: BasketTransaction[];
};

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

const $selectedTxs = createStore<number[]>([]);
const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $validTxs = createStore<BasketTransaction[]>([]);
const $validatingTxs = createStore<number[]>([]);
const $validationWarningShown = createStore<boolean>(false);
const $alreadyValidatedTxs = createStore<number[]>([]);
const $txToRemove = restore(removeTxStarted, null).reset([removeTxCancelled, txRemoved]);

const validateFx = createEffect((transactions: BasketTransaction[]) => {
  for (const tx of transactions) {
    const coreTx = getCoreTx(tx, [TransactionType.BOND, TransactionType.UNSTAKE]);

    if (TransferTypes.includes(coreTx.type) || XcmTypes.includes(coreTx.type)) {
      transferValidateModel.events.validationStarted({ id: tx.id, transaction: coreTx });
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
      // TS thinks that transfer should be in TransactionValidators
      // @ts-ignore`
      TransactionValidators[coreTx.type]({ id: tx.id, transaction: coreTx });
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
  clock: allSelected,
  source: {
    txs: $basketTransactions,
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
  clock: $basketTransactions,
  target: validationStarted,
});

sample({
  clock: validationStarted,
  source: {
    transactions: $basketTransactions,
    apis: networkModel.$apis,
    alreadyValidatedTxs: $alreadyValidatedTxs,
    validatingTxs: $validatingTxs,
  },
  fn: ({ transactions, apis, alreadyValidatedTxs, validatingTxs }) => {
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

    return txsToValidate;
  },
  target: validateFx,
});

sample({
  clock: refreshValidationStarted,
  source: {
    transactions: $basketTransactions,
    apis: networkModel.$apis,
    alreadyValidatedTxs: $alreadyValidatedTxs,
    validatingTxs: $validatingTxs,
  },
  fn: ({ transactions, apis, alreadyValidatedTxs, validatingTxs }) => {
    const chains = new Set(transactions.map((t) => t.coreTx.chainId));

    const txsToValidate = [...chains].reduce<BasketTransaction[]>((acc, chainId) => {
      if (!apis[chainId]) {
        return acc;
      }

      const txs = transactions.filter((tx) => tx.coreTx.chainId === chainId);

      return [...acc, ...txs];
    }, []);

    return txsToValidate;
  },
  target: validateFx,
});

sample({
  clock: validateFx,
  source: $validatingTxs,
  fn: (validatingTxs, txs) => txs.reduce((acc, tx) => addUnique(acc, tx.id), validatingTxs),
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
  clock: txClicked,
  fn: (transaction) => [transaction],
  target: signStarted,
});

sample({
  clock: signStarted,
  source: { allTransactions: $basketTransactions, selectedTxs: $selectedTxs, invalidTxs: $invalidTxs },
  fn: ({ allTransactions, selectedTxs }) => allTransactions.filter((t) => selectedTxs.includes(t.id)),
  target: validateFx,
});

sample({
  clock: $validatingTxs,
  source: {
    validatingTxs: $validatingTxs,
    selectedTxs: $selectedTxs,
  },
  filter: ({ validatingTxs, selectedTxs }) => {
    return selectedTxs.filter((tx) => validatingTxs.includes(tx)).length === 0;
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
  target: [$validTxs, signOperationsModel.events.flowStarted],
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

export const basketPageModel = {
  $basketTransactions,
  $selectedTxs,
  $invalidTxs,
  $validTxs,
  $validationWarningShown,
  $validatingTxs,
  $txToRemove,
  $alreadyValidatedTxs,

  events: {
    validationStarted,
    refreshValidationStarted,
    txSelected,
    txClicked,
    allSelected,
    signStarted,
    cancelValidationWarning,
    proceedValidationWarning,

    removeTxStarted,
    removeTxCancelled,
    txRemoved,
  },
};
