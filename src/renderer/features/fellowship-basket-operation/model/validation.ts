import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type BasketTransaction, type ID, TransactionType } from '@/shared/core';
import { addUnique, removeFromCollection } from '@/shared/lib/utils';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  type FeeMap,
  type ValidationResult,
  collectiveVoteValidateModel,
} from '@/features/operations/OperationsValidation';

const $invalidTxs = createStore<Map<ID, ValidationResult>>(new Map());
const $pendingTxs = createStore<ID[]>([]);

const flow = createGate<{ id: ID; operation: BasketTransaction; feeMap: FeeMap }>();

sample({
  clock: flow.open,
  filter: ({ operation }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return transaction.type === TransactionType.COLLECTIVE_VOTE;
  },
  fn: ({ id, operation, feeMap }) => {
    const transaction = basketOperationsService.getCoreTx(operation);

    return {
      id,
      transaction,
      feeMap,
    };
  },
  target: collectiveVoteValidateModel.events.validationStarted,
});

sample({
  clock: collectiveVoteValidateModel.events.validationStarted,
  source: $pendingTxs,
  fn: (pendingTxs, tx) => addUnique(pendingTxs, tx.id),
  target: $pendingTxs,
});

sample({
  clock: collectiveVoteValidateModel.output.txValidated,
  source: $pendingTxs,
  fn: (pendingTxs, { id }) => removeFromCollection(pendingTxs, id),
  target: $pendingTxs,
});

sample({
  clock: collectiveVoteValidateModel.output.txValidated,
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
