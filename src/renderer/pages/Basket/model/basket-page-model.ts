import { combine, createEffect, createEvent, createStore, sample, scopeBind } from 'effector';

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
} from '@features/operations/OperationsValidation';
import { networkModel } from '@/src/renderer/entities/network';

const txSelected = createEvent<ID>();
const allSelected = createEvent();

const $selectedTxs = createStore<ID[]>([]);
const $invalidTxs = createStore<Set<ID>>(new Set());

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

    if (tx.coreTx.type === TransactionType.ADD_PROXY) {
      addProxyValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.CREATE_PURE_PROXY) {
      addPureProxiedValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.REMOVE_PROXY) {
      removeProxyValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.REMOVE_PURE_PROXY) {
      removePureProxiedValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.BOND) {
      bondNominateValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.NOMINATE) {
      nominateValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.STAKE_MORE) {
      bondExtraValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.DESTINATION) {
      payeeValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.RESTAKE) {
      restakeValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.UNSTAKE) {
      unstakeValidateBound({ id: tx.id, transaction: tx.coreTx });
    }

    if (tx.coreTx.type === TransactionType.REDEEM) {
      withdrawValidateBound({ id: tx.id, transaction: tx.coreTx });
    }
  }
});

const $basketTransactions = combine(
  {
    wallet: walletModel.$activeWallet,
    basket: basketModel.$basket,
  },
  ({ wallet, basket }) => {
    return basket.filter((tx) => {
      const isSameWallet = tx.initiatorWallet === wallet?.id;

      return isSameWallet;
    });
  },
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
  fn: ({ transactions }) => {
    return transactions;
  },
  target: validateFx,
});

sample({
  clock: [
    transferValidateModel.events.txValidated,
    addProxyValidateModel.events.txValidated,
    addPureProxiedValidateModel.events.txValidated,
    removeProxyValidateModel.events.txValidated,
    removePureProxiedValidateModel.events.txValidated,
    bondNominateValidateModel.events.txValidated,
    nominateValidateModel.events.txValidated,
    bondExtraValidateModel.events.txValidated,
    restakeValidateModel.events.txValidated,
    unstakeValidateModel.events.txValidated,
    withdrawValidateModel.events.txValidated,
  ],
  source: $invalidTxs,
  fn: (txs, { id, result }) => {
    if (!result) {
      txs.delete(id);
    } else {
      txs.add(id);
    }

    return txs;
  },

  target: $invalidTxs,
});

export const basketPageModel = {
  $basketTransactions,
  $selectedTxs,
  $invalidTxs,

  events: {
    txSelected,
    allSelected,
  },
};
