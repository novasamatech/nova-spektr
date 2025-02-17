import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type BasketTransaction, type ID, TransactionType } from '@/shared/core';
import { addUnique, removeFromCollection } from '@/shared/lib/utils';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { unlockValidateModel, voteValidateModel } from '@/features/governance';
import {
  type FeeMap,
  type ValidationResult,
  delegateValidateModel,
  removeVoteValidateModel,
  revokeDelegationValidateModel,
} from '@/features/operations/OperationsValidation';

const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $pendingTxs = createStore<ID[]>([]);

const flow = createGate<{ id: ID; operation: BasketTransaction; feeMap: FeeMap }>();

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.DELEGATE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: delegateValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.UNDELEGATE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: revokeDelegationValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.VOTE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: voteValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REMOVE_VOTE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: removeVoteValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.UNLOCK;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: unlockValidateModel.events.validationStarted,
});

const validationStarted = [
  delegateValidateModel.events.validationStarted,
  revokeDelegationValidateModel.events.validationStarted,
  voteValidateModel.events.validationStarted,
  removeVoteValidateModel.events.validationStarted,
  unlockValidateModel.events.validationStarted,
];

const validationFinished = [
  delegateValidateModel.output.txValidated,
  revokeDelegationValidateModel.output.txValidated,
  voteValidateModel.output.txValidated,
  removeVoteValidateModel.output.txValidated,
  unlockValidateModel.output.txValidated,
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
