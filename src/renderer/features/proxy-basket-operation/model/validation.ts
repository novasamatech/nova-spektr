import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type BasketTransaction, type ID, TransactionType } from '@/shared/core';
import { addUnique, removeFromCollection } from '@/shared/lib/utils';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  type FeeMap,
  type ValidationResult,
  addProxyValidateModel,
  addPureProxiedValidateModel,
  removeProxyValidateModel,
  removePureProxiedValidateModel,
} from '@/features/operations/OperationsValidation';

const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $pendingTxs = createStore<ID[]>([]);

const flow = createGate<{ id: ID; operation: BasketTransaction; feeMap: FeeMap }>();

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.ADD_PROXY;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: addProxyValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REMOVE_PROXY;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: removeProxyValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.CREATE_PURE_PROXY;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: addPureProxiedValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REMOVE_PURE_PROXY;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: removePureProxiedValidateModel.events.validationStarted,
});

const validationStarted = [
  addProxyValidateModel.events.validationStarted,
  removeProxyValidateModel.events.validationStarted,
  addPureProxiedValidateModel.events.validationStarted,
  removePureProxiedValidateModel.events.validationStarted,
];

const validationFinished = [
  addProxyValidateModel.output.txValidated,
  removeProxyValidateModel.output.txValidated,
  addPureProxiedValidateModel.output.txValidated,
  removePureProxiedValidateModel.output.txValidated,
];

sample({
  clock: validationStarted,
  source: $pendingTxs,
  fn: (pendingTxs, tx) => addUnique(pendingTxs, tx.id),
  target: $pendingTxs,
});

sample({
  clock: validationStarted,
  source: $pendingTxs,
  fn: (pendingTxs, { id }) => removeFromCollection(pendingTxs, id),
  target: $pendingTxs,
});

sample({
  clock: validationFinished,
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

export const validate = {
  $invalidTxs,
  $pendingTxs,

  gates: {
    flow,
  },
};
