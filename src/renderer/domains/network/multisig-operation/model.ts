import { attach, createEffect, createStore, sample, scopeBind } from 'effector';
import { spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type HexString, type NoID } from '@/shared/core';
import { isEqual } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';

import { deserializeOperation, serializeOperation } from './helpers';
import { onchainOperations, subscribeEventsResource, subscribeIndexerResource } from './resource';
import { multisigOperationService } from './service';
import { type MultisigOperation } from './types';

const $buffer = createStore<MultisigOperation[]>([]);
const $list = createStore<MultisigOperation[]>([]);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(deserializeOperation)),
);

const addOperationsFx = createEffect(async (transactions: NoID<MultisigOperation>[]) => {
  return storageService.multisigOperations
    .createAll(transactions.map(serializeOperation))
    .then(result => result?.map(deserializeOperation) ?? []);
});

const updateOperationsFx = createEffect((transactions: MultisigOperation[]) => {
  return storageService.multisigOperations.updateAll(transactions.map(serializeOperation)).then(() => transactions);
});

const removeTransactionsFx = createEffect((transactions: MultisigOperation[]) => {
  return storageService.multisigOperations.deleteAll(transactions.map(t => t.id)).then(result => result ?? []);
});

type UpdateCallDataParams = {
  operation: MultisigOperation;
  callData: HexString;
};

const updateCallDataFx = attach({
  source: networkModel.$apis,
  effect(apis, { operation, callData }: UpdateCallDataParams) {
    const update = scopeBind(updateOperationsFx, { safe: true });
    const api = apis[operation.chainId];
    if (!api) {
      throw new Error(`Api from tx not found: ${operation.chainId}`);
    }
    try {
      const decoded = decodeCallData(api, operation.accountId, callData);
      const newOperation: MultisigOperation = {
        ...operation,
        section: decoded.section,
        method: decoded.method,
        callData,
        transaction: decoded,
      };

      return update([newOperation]);
    } catch (error) {
      console.error(error);
    }
  },
});

const removeOperationsForAccount = attach({
  source: $list,
  effect(operations, accountId: AccountId) {
    const remove = scopeBind(removeTransactionsFx, { safe: true });
    const operationsToRemove = operations.filter(o => o.accountId === accountId);
    return remove(operationsToRemove);
  },
});

deriveFromResources({
  store: $buffer,
  resources: [onchainOperations, subscribeIndexerResource],
  map(state, operations) {
    return multisigOperationService.mergeMultisigOperations(state, operations);
  },
});

deriveFromResources({
  store: $buffer,
  resources: [subscribeEventsResource],
  map: (state, { chainId, operationId, event }) => {
    const operation = state.find(x => x.id === operationId && x.chainId === chainId);
    if (!operation) return state;

    const newOperation = {
      ...operation,
      status: event.status === 'reject' ? 'cancelled' : operation.status,
      events: multisigOperationService.mergeEvents(operation?.events, [event]),
    };

    return multisigOperationService.mergeMultisigOperations(state, [newOperation]);
  },
});

sample({
  clock: populateFx.doneData,
  target: $list,
});

sample({
  clock: addOperationsFx.doneData,
  source: $list,
  fn: multisigOperationService.mergeMultisigOperations,
  target: $list,
});

sample({
  clock: updateOperationsFx.doneData,
  source: $list,
  fn: multisigOperationService.mergeMultisigOperations,
  target: $list,
});

sample({
  clock: removeTransactionsFx.doneData,
  source: $list,
  fn(list, removedIds) {
    return list.filter(l => !removedIds.includes(l.id));
  },
  target: $list,
});

sample({
  clock: $buffer.updates,
  source: $list,
  fn(operations, buffer) {
    const toAdd: MultisigOperation[] = [];
    const toUpdate: MultisigOperation[] = [];

    for (const newOperation of buffer) {
      const existingOperation = operations.find(o => o.id === newOperation.id);
      if (existingOperation) {
        if (!isEqual(existingOperation, newOperation)) {
          toUpdate.push({
            ...newOperation,
            section: newOperation.section || existingOperation.section,
            method: newOperation.method || existingOperation.method,
            transaction: newOperation.transaction || existingOperation.transaction,
          });
        }
      } else {
        toAdd.push(newOperation);
      }
    }

    return { toAdd, toUpdate };
  },
  target: spread({
    toAdd: addOperationsFx,
    toUpdate: updateOperationsFx,
  }),
});

export const multisigOperation = {
  $list,

  populate: populateFx,
  addOperations: addOperationsFx,
  updateOperations: updateOperationsFx,
  removeOperationsForAccount,
  updateCallData: updateCallDataFx,
  requestOperations: onchainOperations.request,
  subscribe: subscribeIndexerResource.subscribe,
  unsubscribe: subscribeIndexerResource.unsubscribe,
  subscribeEvents: subscribeEventsResource.subscribe,
  unsubscribeEvents: subscribeEventsResource.unsubscribe,
};
