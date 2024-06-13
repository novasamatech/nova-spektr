import { combine, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';

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

const txSelected = createEvent<ID>();
const txClicked = createEvent<BasketTransaction>();
const allSelected = createEvent();

const $selectedTxs = createStore<ID[]>([]);
const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());

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
  ({ wallet, basket }) => basket.filter((tx) => tx.initiatorWallet === wallet?.id),
);

sample({
  clock: txSelected,
  source: $selectedTxs,
  fn: (selectedTxs, id) => {
    if (selectedTxs.includes(id)) {
      return selectedTxs.filter((tx) => tx !== id);
    }

    return selectedTxs.concat(id);
  },
  target: $selectedTxs,
});

sample({
  clock: allSelected,
  source: {
    txs: $basketTransactions,
    selectedTxs: $selectedTxs,
  },
  fn: ({ txs, selectedTxs }) => (selectedTxs.length === txs.length ? [] : txs.map((tx) => tx.id)),
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
    const newTxs = new Map(txs);

    if (!result) {
      newTxs.delete(id);
    } else {
      newTxs.set(id, result);
    }

    return newTxs;
  },

  target: $invalidTxs,
});

sample({
  clock: txClicked,
  fn: (transaction) => [transaction],
  target: signOperationsModel.events.flowStarted,
});

export const basketPageModel = {
  $basketTransactions,
  $selectedTxs,
  $invalidTxs,

  events: {
    txSelected,
    txClicked,
    allSelected,
  },
};
