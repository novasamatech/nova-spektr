import { attach, createEffect, createStore, restore, sample, scopeBind } from 'effector';
import { once, readonly, spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
import {
  type Chain,
  type ChainId,
  type CreateMultisigOperationParams,
  type HexString,
  type NotificationStatus,
  NotificationType,
} from '@/shared/core';
import { createQueuedEffect, pairwise } from '@/shared/effector';
import { formatBalance, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { decodeCallData } from '@/entities/transaction';
import { accounts } from '../account/store';
import { type AnyAccount } from '../account/types';

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

const getStatusSuffix = (operationStatus: 'pending' | 'executed' | 'cancelled' | 'error'): string => {
  switch (operationStatus) {
    case 'pending':
      return 'created';
    case 'executed':
      return 'executed';
    case 'cancelled':
      return 'rejected';
    case 'error':
      return 'error';
  }
};

const getOperationNotificationTitle = (operation: MultisigOperation, chains: Record<ChainId, Chain>): string => {
  // ToDo: doesn't return proper result
  const transformerResult = multisigOperationService.operationTitleTransformer({ operation, chains });

  let title: string;
  let formattedAmount: string | undefined;

  if (transformerResult?.title) {
    title = transformerResult.title;
    // Format amount if available (same as MultisigOperationNotificationComponent)
    if (transformerResult.amount) {
      const { precision, symbol } = transformerResult.amount.asset;
      const { formatted } = formatBalance(transformerResult.amount.value, precision);
      formattedAmount = `${formatted} ${symbol}`;
    }
  } else {
    title = getNotificationTitle(operation.status);
  }

  return [title, formattedAmount, getStatusSuffix(operation.status)].filter(nonNullable).join(' ');
};

const createOperationNotification = (
  operation: MultisigOperation,
  chains: Record<ChainId, Chain>,
  walletName?: string,
): CreateMultisigOperationParams => {
  const description = walletName ? `by ${walletName}` : undefined;
  const title = getOperationNotificationTitle(operation, chains);

  const relativeLink = multisigOperationService.generateMultisigOperationRelativeLink({
    chainId: operation.chainId,
    callHash: operation.callHash,
    accountId: operation.accountId,
    blockCreated: operation.blockCreated,
    indexCreated: operation.indexCreated,
  });

  return {
    key: `${NotificationType.MULTISIG_OPERATION}-${multisigOperationService.getOperationId(operation.chainId, operation.callHash, operation.accountId, operation.blockCreated, operation.indexCreated)}-${operation.status}`,
    type: NotificationType.MULTISIG_OPERATION,
    status: getNotificationStatus(operation.status),
    issuer: operation.accountId,
    title,
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

const getOperationId = (op: MultisigOperation) =>
  multisigOperationService.getOperationId(op.chainId, op.callHash, op.accountId, op.blockCreated, op.indexCreated);

const getNotificationKey = (op: MultisigOperation) =>
  `${NotificationType.MULTISIG_OPERATION}-${getOperationId(op)}-${op.status}`;

const operationChanges = pairwise($list)
  .map(({ prev: prevState, current: update }) => {
    const previousOpsMap = new Map(prevState.map(op => [getOperationId(op), op]));
    const currentOpsMap = new Map(update.map(op => [getOperationId(op), op]));

    const added: MultisigOperation[] = [];
    const removedKeys: string[] = [];

    for (const item of update) {
      const previousOp = previousOpsMap.get(getOperationId(item));

      if (!previousOp) {
        added.push(item);
      } else if (previousOp.status !== item.status && item.status !== 'pending') {
        added.push(item);
      }
    }

    for (const prevOp of prevState) {
      if (!currentOpsMap.has(getOperationId(prevOp))) {
        removedKeys.push(getNotificationKey(prevOp));
      }
    }

    return { added, removedKeys };
  })
  .filter({ fn: ({ added, removedKeys }) => added.length > 0 || removedKeys.length > 0 });

sample({
  clock: operationChanges,
  source: { populated: $populated, accountsList: accounts.$list, chains: networkModel.$chains },
  filter: ({ populated }) => populated,
  fn: ({ accountsList, chains }, { added, removedKeys }) => {
    const accountsMap = new Map<AccountId, AnyAccount>(accountsList.map(account => [account.accountId, account]));

    const notificationsToAdd = added
      .filter(operation => {
        const account = accountsMap.get(operation.accountId);

        return !account?.createdAt || operation.timestamp >= account.createdAt;
      })
      .map(operation => {
        const account = accountsMap.get(operation.accountId);

        return createOperationNotification(operation, chains, account?.name);
      });

    return {
      added: notificationsToAdd,
      removed: { keys: removedKeys },
    };
  },
  target: spread({
    added: notificationModel.events.notificationsAdded,
    removed: notificationModel.events.notificationsRemoved,
  }),
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
