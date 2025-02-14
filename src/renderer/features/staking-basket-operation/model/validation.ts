import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type BasketTransaction, type ID, TransactionType } from '@/shared/core';
import { addUnique, removeFromCollection } from '@/shared/lib/utils';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  type FeeMap,
  type ValidationResult,
  bondExtraValidateModel,
  bondNominateValidateModel,
  nominateValidateModel,
  restakeValidateModel,
  unstakeValidateModel,
  withdrawValidateModel,
} from '@/features/operations/OperationsValidation';

const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $pendingTxs = createStore<ID[]>([]);

const flow = createGate<{ id: ID; operation: BasketTransaction; feeMap: FeeMap }>();

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.BOND;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: bondNominateValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.STAKE_MORE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: bondExtraValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.UNSTAKE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: unstakeValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.RESTAKE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: restakeValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.REDEEM;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: withdrawValidateModel.events.validationStarted,
});

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.NOMINATE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: nominateValidateModel.events.validationStarted,
});

const validationStarted = [
  bondNominateValidateModel.events.validationStarted,
  bondExtraValidateModel.events.validationStarted,
  unstakeValidateModel.events.validationStarted,
  restakeValidateModel.events.validationStarted,
  withdrawValidateModel.events.validationStarted,
  nominateValidateModel.events.validationStarted,
];

const validationFinished = [
  bondNominateValidateModel.output.txValidated,
  bondExtraValidateModel.output.txValidated,
  unstakeValidateModel.output.txValidated,
  restakeValidateModel.output.txValidated,
  withdrawValidateModel.output.txValidated,
  nominateValidateModel.output.txValidated,
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
