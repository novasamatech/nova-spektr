import { sample } from 'effector';
import { t } from 'i18next';
import { spread } from 'patronum';

import {
  type Chain,
  type ChainId,
  type CreateMultisigEventParams,
  type CreateMultisigOperationParams,
  type NotificationStatus,
  NotificationType,
} from '@/shared/core';
import { pairwise } from '@/shared/effector';
import { formatBalance, getAssetById, nonNullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import {
  type AnyAccount,
  type MultisigEvent,
  type MultisigOperation,
  accounts,
  multisigOperation,
  multisigOperationService,
} from '@/domains/network';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { findCoreTransaction } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { operationTitleTransformer } from '../components/Operation';

type NewEvent = {
  operation: MultisigOperation;
  event: MultisigEvent;
};

const $accountsMap = accounts.$list.map(accountsList =>
  Object.fromEntries(accountsList.map(account => [account.accountId, account])),
);

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

const getFallbackNotificationTitle = (operationStatus: 'pending' | 'executed' | 'cancelled' | 'error'): string => {
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

const getOperationNotificationTitle = (
  operation: MultisigOperation,
  chains: Record<ChainId, Chain>,
  account?: AnyAccount,
): string => {
  const showCoreTransaction = account ? accountUtils.isFlexibleMultisigAccount(account) : false;
  const coreTx = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

  const chain = chains[operation.chainId];
  const assetId = coreTx?.args?.['assetId'];
  const asset = assetId && chain ? (getAssetById(assetId, chain.assets) ?? null) : null;

  const transformerResult = operationTitleTransformer({
    operation,
    showCoreTransaction,
    chains,
    asset,
    t,
  });

  if (!transformerResult?.title) {
    return getFallbackNotificationTitle(operation.status);
  }

  let formattedAmount: string | undefined;
  if (transformerResult.amount) {
    const { precision, symbol } = transformerResult.amount.asset;
    const { formatted } = formatBalance(transformerResult.amount.value, precision);
    formattedAmount = `${formatted} ${symbol}`;
  }

  return [transformerResult.title, formattedAmount, getStatusSuffix(operation.status)].filter(nonNullable).join(' ');
};

const createOperationNotification = (
  operation: MultisigOperation,
  chains: Record<ChainId, Chain>,
  account?: AnyAccount,
): CreateMultisigOperationParams => {
  const description = account?.name ? `by ${account.name}` : undefined;
  const title = getOperationNotificationTitle(operation, chains, account);

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

const createEventNotification = (
  operation: MultisigOperation,
  event: MultisigEvent,
  signerName?: string,
): CreateMultisigEventParams => {
  const relativeLink = multisigOperationService.generateMultisigOperationRelativeLink({
    chainId: operation.chainId,
    callHash: operation.callHash,
    accountId: operation.accountId,
    blockCreated: operation.blockCreated,
    indexCreated: operation.indexCreated,
  });

  const operationId = multisigOperationService.getOperationId(
    operation.chainId,
    operation.callHash,
    operation.accountId,
    operation.blockCreated,
    operation.indexCreated,
  );

  // For reject events, use the same key as the cancelled operation notification to deduplicate
  const key =
    event.status === 'reject'
      ? `${NotificationType.MULTISIG_OPERATION}-${operationId}-cancelled`
      : `${NotificationType.MULTISIG_EVENT}-${operationId}-${event.id}`;

  return {
    key,
    type: NotificationType.MULTISIG_EVENT,
    status: event.status === 'approve' ? 'success' : 'error',
    issuer: operation.accountId,
    title: event.status === 'approve' ? 'Multisig operation signed' : 'Multisig operation rejected',
    description: signerName ? `by ${signerName}` : undefined,
    multisigAccountId: operation.accountId,
    callHash: operation.callHash,
    callTimepoint: {
      height: operation.blockCreated,
      index: operation.indexCreated,
    },
    chainId: operation.chainId,
    signerAccountId: event.accountId,
    eventStatus: event.status,
    link: {
      title: 'notifications.details.viewOperation',
      path: relativeLink,
    },
    batch: {
      title: 'notifications.toast.batch.multisigEventsUpdated',
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

const operationChanges = pairwise(multisigOperation.$list)
  .map(({ prev: prevState, current: update }) => {
    if (prevState.length < update.length) {
      const existingIds = new Set(prevState.map(o => o.id));
      console.log(
        'Notifications: new operations',
        update.filter(i => !existingIds.has(i.id)),
      );
    }
    if (prevState.length > update.length) {
      const newIds = new Set(update.map(o => o.id));
      console.log(
        'Notifications: removed operations',
        prevState.filter(i => !newIds.has(i.id)),
      );
    }

    const prevMap = new Map(update.map(o => [o.id, o]));
    const changedOperations = update.filter(newOperation => {
      const oldOperation = prevMap.get(newOperation.id);
      if (!oldOperation) return false;
      return newOperation.status !== oldOperation.status || newOperation.events !== oldOperation.events;
    });
    if (changedOperations.length) {
      console.log('Notifications: operations changed', changedOperations);
    }

    const previousOpsMap = new Map(prevState.map((op: MultisigOperation) => [getOperationId(op), op]));
    const currentOpsMap = new Map(update.map((op: MultisigOperation) => [getOperationId(op), op]));

    const added: MultisigOperation[] = [];
    const removedKeys: string[] = [];
    const newEvents: NewEvent[] = [];

    for (const item of update) {
      const previousOp = previousOpsMap.get(getOperationId(item));

      if (!previousOp) {
        added.push(item);
      } else if (previousOp.status !== item.status && item.status !== 'pending') {
        added.push(item);
      } else if (previousOp.events.length !== item.events.length) {
        const previousEventIds = new Set(previousOp.events.map(e => e.id));
        for (const event of item.events) {
          if (!previousEventIds.has(event.id)) {
            newEvents.push({ operation: item, event });
          }
        }
      }
    }

    for (const prevOp of prevState) {
      if (!currentOpsMap.has(getOperationId(prevOp))) {
        removedKeys.push(getNotificationKey(prevOp));
      }
    }

    if (added.length || removedKeys.length || newEvents.length) {
      console.log('Notifications: changes output', { added, removedKeys, newEvents });
    }

    return { added, removedKeys, newEvents };
  })
  .filter({
    fn: ({ added, removedKeys, newEvents }) => added.length > 0 || removedKeys.length > 0 || newEvents.length > 0,
  });

sample({
  clock: operationChanges,
  source: { populated: multisigOperation.$populated, accountsMap: $accountsMap, chains: networkModel.$chains },
  filter: ({ populated }) => populated,
  fn: ({ accountsMap, chains }, { added, removedKeys, newEvents }) => {
    const userOperations: MultisigOperation[] = [];
    const oldOperations: MultisigOperation[] = [];
    const operationNotifications = added
      .filter(operation => {
        // Don't notify the operation creator
        if (operation.status === 'pending' && nonNullable(accountsMap[operation.depositor])) {
          userOperations.push(operation);
          return false;
        }

        const account = accountsMap[operation.accountId];
        // Show only new operations
        const isNew = !account?.createdAt || operation.timestamp >= account.createdAt;
        if (!isNew) {
          oldOperations.push(operation);
        }
        return isNew;
      })
      .map(operation => {
        const account = accountsMap[operation.accountId];

        return createOperationNotification(operation, chains, account);
      });

    if (userOperations.length) {
      console.log('Notifications: filtered out user operation', userOperations);
    }

    if (oldOperations.length) {
      console.log('Notifications: filtered out old operation', oldOperations);
    }

    const eventNotifications = newEvents
      .filter(({ event }) => {
        // Don't notify if the current user caused the event
        if (event.accountId in accountsMap) {
          return false;
        }

        return true;
      })
      .map(({ operation, event }) => {
        const signerAccount = accountsMap[event.accountId];

        return createEventNotification(operation, event, signerAccount?.name);
      });

    return {
      added: [...operationNotifications, ...eventNotifications],
      removed: { keys: removedKeys },
    };
  },
  target: spread({
    added: notificationModel.events.notificationsAdded,
    removed: notificationModel.events.notificationsRemoved,
  }),
});
