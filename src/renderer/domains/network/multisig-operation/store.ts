import { attach, createEffect, createStore, restore, sample, scopeBind } from 'effector';
import { once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import {
  type CreateMultisigOperationParams,
  type HexString,
  type NotificationStatus,
  NotificationType,
} from '@/shared/core';
import { createQueuedEffect, pairwise } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { decodeCallData } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { accounts } from '../account/store';

import { deserializeOperation, serializeOperation } from './helpers';
import { fetchResource, subscribeEventsResource, subscribeResource } from './resource';
import { multisigOperationService } from './service';
import { type MultisigOperation } from './types';

const $list = createStore<MultisigOperation[]>([]);

const $populated = restore(
  once($list.updates).map(() => true),
  false,
);

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

/**
 * We want to sync operations between database and in-memory store. Its
 * important to do so because operations can be deleted from the database
 * without calling removeTransactionsFx (f.e. in case of fork).
 */
const syncInMemoryOperationsToDbFx = createQueuedEffect(async (allOperations: MultisigOperation[]) => {
  const dbOperations = await storageService.multisigOperations.readAll();
  const dbOperationIds = dbOperations.map(op => op.id);

  await storageService.multisigOperations.deleteAll(dbOperationIds);
  await storageService.multisigOperations.insertAll(allOperations.map(serializeOperation));
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

const getNotificationStatus = (operationStatus: 'pending' | 'executed' | 'cancelled' | 'error'): NotificationStatus => {
  switch (operationStatus) {
    case 'pending':
      return 'info';
    case 'executed':
      return 'success';
    case 'cancelled':
    case 'error':
      return 'error';
  }
};

const getNotificationTitle = (operationStatus: 'pending' | 'executed' | 'cancelled' | 'error'): string => {
  switch (operationStatus) {
    case 'pending':
      return 'Multisig operation created';
    case 'executed':
      return 'Multisig operation executed';
    case 'cancelled':
      return 'Multisig operation rejected';
    case 'error':
      return 'Multisig operation error';
  }
};

type CreateNotificationParams = {
  operation: MultisigOperation;
  walletName?: string;
  issuer: AccountId;
};

const createOperationNotification = ({
  operation,
  walletName,
  issuer,
}: CreateNotificationParams): CreateMultisigOperationParams => {
  const description = walletName ? `by ${walletName}` : undefined;

  const relativeLink = multisigOperationService.generateMultisigOperationRelativeLink({
    chainId: operation.chainId,
    callHash: operation.callHash,
    accountId: operation.accountId,
    blockCreated: operation.blockCreated,
    indexCreated: operation.indexCreated,
  });

  return {
    key: `${NotificationType.MULTISIG_OPERATION}-${multisigOperationService.getOperationId(operation.chainId, operation.callHash, operation.accountId, operation.blockCreated)}-${operation.status}`,
    type: NotificationType.MULTISIG_OPERATION,
    status: getNotificationStatus(operation.status),
    issuer,
    title: getNotificationTitle(operation.status),
    description,
    multisigAccountId: operation.accountId,
    callHash: operation.callHash,
    callTimepoint: {
      height: operation.blockCreated,
      index: operation.indexCreated,
    },
    chainId: operation.chainId,
    link: {
      title: 'notifications.details.viewOperation',
      path: relativeLink,
    },
    batch: {
      title: 'notifications.toast.batch.multisigOperationsUpdated',
      link: {
        title: 'notifications.toast.viewOperations',
        path: Paths.OPERATIONS,
      },
    },
  };
};

const operationChanges = pairwise($list)
  .map(({ prev: prevState, current: update }) => {
    const previousOpsMap = new Map(
      prevState.map(op => [
        multisigOperationService.getOperationId(
          op.chainId,
          op.callHash,
          op.accountId,
          op.blockCreated,
        ),
        op,
      ]),
    );
    const changes: MultisigOperation[] = [];

    for (const item of update) {
      const previousOp = previousOpsMap.get(
        multisigOperationService.getOperationId(
          item.chainId,
          item.callHash,
          item.accountId,
          item.blockCreated,
        ),
      );

      if (!previousOp) {
        changes.push(item);
      } else if (previousOp.status !== item.status && item.status !== 'pending') {
        changes.push(item);
      }
    }

    return changes;
  })
  .filter({ fn: notifications => notifications.length > 0 });

sample({
  clock: operationChanges,
  source: { populated: $populated, accountsList: accounts.$list },
  filter: ({ populated }) => populated,
  fn: ({ accountsList }, operations) => {
    const accountsMap = new Map(
      accountsList.filter(accountUtils.isAnyMultisigAccount).map(account => {
        const multisigAccountId = accountUtils.isFlexibleMultisigAccount(account)
          ? account.multisigAccountId
          : account.accountId;

        return [multisigAccountId, account];
      }),
    );

    return operations
      .filter(operation => {
        const account = accountsMap.get(operation.accountId);

        return !account?.createdAt || operation.timestamp >= account.createdAt;
      })
      .map(operation => {
        const account = accountsMap.get(operation.accountId);
        const issuer = account?.accountId ?? operation.accountId;

        return createOperationNotification({ operation, walletName: account?.name, issuer });
      });
  },
  target: notificationModel.events.notificationsAdded,
});

deriveFromResources({
  store: $list,
  resources: [fetchResource, subscribeResource],
  map(state, operations) {
    return multisigOperationService.updateMultisigOperations(state, operations);
  },
});

deriveFromResources({
  store: $list,
  resources: [subscribeEventsResource],
  map: (state, { chainId, operationId, event }) => {
    const operationIndex = state.findIndex(x => x.id === operationId && x.chainId === chainId);
    const operation = state[operationIndex];

    if (operationIndex === -1 || !operation) return state;

    const updatedOperation = {
      ...operation,
      status: event.status === 'reject' ? 'cancelled' : operation.status,
      events: multisigOperationService.mergeEvents(operation.events, [event]),
    };

    return multisigOperationService.mergeMultisigOperations(state, [updatedOperation]);
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
  clock: $list,
  filter: list => list.length > 0,
  target: syncInMemoryOperationsToDbFx,
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
  $populated: readonly($populated),
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

  __test: {
    $list,
    $populated,
  },
};
