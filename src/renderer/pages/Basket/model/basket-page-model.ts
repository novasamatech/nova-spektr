import { combine, createEffect, createEvent, createStore, sample, scopeBind, split } from 'effector';
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

const txSelected = createEvent<{ id: ID; value: boolean }>();
const txClicked = createEvent<BasketTransaction>();
const allSelected = createEvent();
const signStarted = createEvent();
const validationCompleted = createEvent();
const signContinued = createEvent();
const signTransactionsReceived = createEvent<{
  valid: BasketTransaction[];
  invalid: BasketTransaction[];
}>();
const validationWarningShown = createEvent<{
  valid: BasketTransaction[];
  invalid: BasketTransaction[];
}>();
const proceedValidationWarning = createEvent<{
  valid: BasketTransaction[];
  invalid: BasketTransaction[];
}>();
const cancelValidationWarning = createEvent();

const $selectedTxs = createStore<Set<number>>(new Set());
const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $validTxs = createStore<BasketTransaction[]>([]);
const $validatingTxs = createStore<Set<number>>(new Set());
const $validationWarningShown = createStore<boolean>(false);

const validateFx = createEffect((transactions: BasketTransaction[]) => {
  const validateTransferBound = scopeBind(transferValidateModel.events.validationStarted, { safe: true });
  const addProxyValidateBound = scopeBind(addProxyValidateModel.events.validationStarted, { safe: true });
  const addPureProxiedValidateBound = scopeBind(addPureProxiedValidateModel.events.validationStarted, { safe: true });
  const removeProxyValidateBound = scopeBind(removeProxyValidateModel.events.validationStarted, { safe: true });
  const removePureProxiedValidateBound = scopeBind(removePureProxiedValidateModel.events.validationStarted, {
    safe: true,
  });
  const bondNominateValidateBound = scopeBind(bondNominateValidateModel.events.validationStarted, { safe: true });
  const nominateValidateBound = scopeBind(nominateValidateModel.events.validationStarted, { safe: true });
  const bondExtraValidateBound = scopeBind(bondExtraValidateModel.events.validationStarted, { safe: true });
  const payeeValidateBound = scopeBind(payeeValidateModel.events.validationStarted, { safe: true });
  const restakeValidateBound = scopeBind(restakeValidateModel.events.validationStarted, { safe: true });
  const unstakeValidateBound = scopeBind(unstakeValidateModel.events.validationStarted, { safe: true });
  const withdrawValidateBound = scopeBind(withdrawValidateModel.events.validationStarted, { safe: true });

  for (const tx of transactions) {
    if (TransferTypes.includes(tx.coreTx.type) || XcmTypes.includes(tx.coreTx.type)) {
      validateTransferBound({ id: tx.id, transaction: tx.coreTx });
    }

    const TransactionValidators = {
      [TransactionType.ADD_PROXY]: addProxyValidateBound,
      [TransactionType.CREATE_PURE_PROXY]: addPureProxiedValidateBound,
      [TransactionType.REMOVE_PROXY]: removeProxyValidateBound,
      [TransactionType.REMOVE_PURE_PROXY]: removePureProxiedValidateBound,
      [TransactionType.BOND]: bondNominateValidateBound,
      [TransactionType.NOMINATE]: nominateValidateBound,
      [TransactionType.STAKE_MORE]: bondExtraValidateBound,
      [TransactionType.DESTINATION]: payeeValidateBound,
      [TransactionType.RESTAKE]: restakeValidateBound,
      [TransactionType.UNSTAKE]: unstakeValidateBound,
      [TransactionType.REDEEM]: withdrawValidateBound,
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
    const newSelectedTxs = new Set(selectedTxs);

    if (value) {
      newSelectedTxs.add(id);
    } else {
      newSelectedTxs.delete(id);
    }

    return newSelectedTxs;
  },
  target: $selectedTxs,
});

sample({
  clock: allSelected,
  source: {
    txs: $basketTransactions,
    selectedTxs: $selectedTxs,
  },
  fn: ({ txs, selectedTxs }) => new Set(selectedTxs.size === txs.length ? [] : txs.map((tx) => tx.id)),
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
  fn: (txs) => {
    return new Set(txs.map((tx) => tx.id));
  },
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
    const validatingTxs = new Set(txs);
    validatingTxs.delete(id);

    return validatingTxs;
  },

  target: $validatingTxs,
});

sample({
  clock: $validatingTxs,
  filter: (txs) => {
    return txs.size === 0;
  },
  target: validationCompleted,
});

sample({
  clock: txClicked,
  fn: (transaction) => [transaction],
  target: signOperationsModel.events.flowStarted,
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
  fn: ({ allTransactions, selectedTxs }) => allTransactions.filter((t) => selectedTxs.has(t.id)),
  target: validateFx,
});

sample({
  clock: signContinued,
  source: { allTransactions: $basketTransactions, selectedTxs: $selectedTxs, invalidTxs: $invalidTxs },
  fn: ({ allTransactions, selectedTxs, invalidTxs }) => {
    const filteredTxs = allTransactions.filter((t) => selectedTxs.has(t.id));

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
