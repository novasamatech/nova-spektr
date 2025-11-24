import { attach, createEffect, createStore, sample, scopeBind } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type HexString, type MultisigOperationNotification, type NoID, NotificationType } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { decodeCallData } from '@/entities/transaction';

import { deserializeOperation, serializeOperation } from './helpers';
import { fetchResource, subscribeEventsResource, subscribeResource } from './resource';
import { multisigOperationService } from './service';
import { type MultisigOperation } from './types';

const $list = createStore<MultisigOperation[]>([]);
const $previousList = createStore<MultisigOperation[]>([]);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(deserializeOperation)),
);

const addOperationsFx = createEffect(async (operations: MultisigOperation[]) => {
  return storageService.multisigOperations
    .createAll(operations.map(serializeOperation))
    .then(result => result?.map(deserializeOperation) ?? []);
});

const updateOperationsFx = createEffect((operations: MultisigOperation[]) => {
  return storageService.multisigOperations.updateAll(operations.map(serializeOperation)).then(() => operations);
});

const removeTransactionsFx = createEffect((operations: MultisigOperation[]) => {
  return storageService.multisigOperations.deleteAll(operations.map(t => t.id)).then(result => result ?? []);
});

const syncOperationsFx = createQueuedEffect(async (operations: MultisigOperation[]) => {
  await storageService.multisigOperations.insertAll(operations.map(serializeOperation));
});

const $callDataUpdated = createStore<MultisigOperation | null>(null);

type UpdateCallDataParams = {
  operation: MultisigOperation;
  callData: HexString;
};

const updateCallDataFx = attach({
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
  },
  async effect({ apis, chains }, { operation, callData }: UpdateCallDataParams) {
    const update = scopeBind(updateOperationsFx, { safe: true });
    const api = apis[operation.chainId];
    if (!api) {
      throw new Error(`Api from tx not found: ${operation.chainId}`);
    }
    try {
      const decoded = decodeCallData(api, operation.accountId, callData, chains);
      const newOperation: MultisigOperation = {
        ...operation,
        section: decoded.section,
        method: decoded.method,
        callData,
        transaction: decoded,
      };

      await update([newOperation]);
      return newOperation;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
});

const removeOperationsForAccountFx = attach({
  source: $list,
  effect(operations, accountId: AccountId) {
    const remove = scopeBind(removeTransactionsFx, { safe: true });
    const operationsToRemove = operations.filter(o => o.accountId === accountId);
    return remove(operationsToRemove);
  },
});

const createOperationNotification = (
  operation: MultisigOperation,
  status: 'created' | 'executed' | 'cancelled' | 'error',
): NoID<MultisigOperationNotification> => ({
  type: NotificationType.MULTISIG_OPERATION,
  read: false,
  dateCreated: status === 'created' ? operation.timestamp || Date.now() : Date.now(),
  multisigAccountId: operation.accountId,
  callHash: operation.callHash,
  callTimepoint: {
    height: operation.blockCreated,
    index: operation.indexCreated,
  },
  chainId: operation.chainId,
  operationId: operation.id,
  status,
});

sample({
  clock: $list,
  source: $previousList,
  fn: (previousOperations, currentOperations) => {
    const previousOpsMap = new Map(previousOperations.map(op => [op.id, op]));
    const notifications: NoID<MultisigOperationNotification>[] = [];

    for (const currentOp of currentOperations) {
      const previousOp = previousOpsMap.get(currentOp.id);

      if (!previousOp) {
        notifications.push(createOperationNotification(currentOp, 'created'));
      } else if (previousOp.status !== currentOp.status && currentOp.status !== 'pending') {
        notifications.push(createOperationNotification(currentOp, currentOp.status));
      }
    }

    return notifications;
  },
  target: notificationModel.events.notificationsAdded,
});

// update previous list after notifications are sent
sample({
  clock: $list,
  target: $previousList,
});

deriveFromResources({
  store: $list,
  resources: [fetchResource, subscribeResource],
  map(state, operations) {
    return multisigOperationService.mergeMultisigOperations(state, operations);
  },
});

deriveFromResources({
  store: $list,
  resources: [subscribeEventsResource],
  map: (state, { chainId, operationId, event }) => {
    const operation = state.find(x => x.id === operationId && x.chainId === chainId);
    if (!operation) return state;

    const newOperation = {
      ...operation,
      status: event.status === 'reject' ? 'cancelled' : operation.status,
      events: multisigOperationService.mergeEvents(operation.events, [event]),
    };

    return multisigOperationService.mergeMultisigOperations(state, [newOperation]);
  },
});

sample({
  clock: populateFx.doneData,
  target: [$list, $previousList],
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
  clock: $list,
  target: syncOperationsFx,
});

// Handle successful call data updates
sample({
  clock: updateCallDataFx.doneData,
  target: $callDataUpdated,
});

// Clear the last updated operation when new update starts
sample({
  clock: updateCallDataFx,
  fn: () => null,
  target: $callDataUpdated,
});

export const multisigOperation = {
  $list,
  $callDataUpdated,

  populate: populateFx,
  addOperations: addOperationsFx,
  updateOperations: updateOperationsFx,
  removeOperationsForAccount: removeOperationsForAccountFx,
  updateCallData: updateCallDataFx,
  requestOperations: fetchResource.request,
  subscribe: subscribeResource.subscribe,
  unsubscribe: subscribeResource.unsubscribe,
  subscribeEvents: subscribeEventsResource.subscribe,
  unsubscribeEvents: subscribeEventsResource.unsubscribe,
};
