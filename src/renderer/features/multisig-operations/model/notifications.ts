import { createStore, sample } from 'effector';
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

const $anyMultisigAccountsMap = accounts.$list.map(accountsList =>
  Object.fromEntries(
    accountsList.filter(accountUtils.isAnyMultisigAccount).map(account => [account.accountId, account]),
  ),
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

const getBatchTitle = (operationStatus: 'pending' | 'executed' | 'cancelled' | 'error'): string => {
  switch (operationStatus) {
    case 'pending':
      return 'notifications.toast.batch.multisigOperationsAdded';
    case 'executed':
      return 'notifications.toast.batch.multisigOperationsApproved';
    case 'cancelled':
      return 'notifications.toast.batch.multisigOperationsRejected';
    case 'error':
      return 'notifications.toast.batch.multisigOperationsError';
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
      title: getBatchTitle(operation.status),
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
      title:
        event.status === 'approve'
          ? 'notifications.toast.batch.multisigOperationsApproved'
          : 'notifications.toast.batch.multisigOperationsRejected',
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
    const previousOpsMap = new Map(prevState.map((op: MultisigOperation) => [getOperationId(op), op]));
    const currentOpsMap = new Map(update.map((op: MultisigOperation) => [getOperationId(op), op]));

    const newOperations: MultisigOperation[] = [];
    const statusChanges: MultisigOperation[] = [];
    const removedKeys: string[] = [];
    const newEvents: NewEvent[] = [];

    for (const item of update) {
      const previousOp = previousOpsMap.get(getOperationId(item));

      if (!previousOp) {
        newOperations.push(item);
      } else if (previousOp.status !== item.status && item.status !== 'pending') {
        statusChanges.push(item);
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

    return { newOperations, statusChanges, removedKeys, newEvents };
  })
  .filter({
    fn: ({ newOperations, statusChanges, removedKeys, newEvents }) =>
      newOperations.length > 0 || statusChanges.length > 0 || removedKeys.length > 0 || newEvents.length > 0,
  });

sample({
  clock: operationChanges,
  source: {
    populated: multisigOperation.$populated,
    anyMultisigAccountsMap: $anyMultisigAccountsMap,
    chains: networkModel.$chains,
  },
  filter: ({ populated }) => populated,
  fn: ({ anyMultisigAccountsMap, chains }, { newOperations, statusChanges, removedKeys, newEvents }) => {
    // Filter new operations - apply timestamp filter to exclude operations created before account was connected
    const newOperationNotifications = newOperations
      .filter(operation => {
        // Don't notify the operation creator
        if (operation.status === 'pending' && nonNullable(anyMultisigAccountsMap[operation.depositor])) {
          return false;
        }

        const account = anyMultisigAccountsMap[operation.accountId];
        // Show only operations created after account was connected
        return nonNullable(account) && operation.timestamp >= account.createdAt;
      })
      .map(operation => {
        const account = anyMultisigAccountsMap[operation.accountId];

        return createOperationNotification(operation, chains, account);
      });

    // Status changes should always create notifications regardless of when the operation was created
    const statusChangeNotifications = statusChanges.map(operation => {
      const account = anyMultisigAccountsMap[operation.accountId];

      return createOperationNotification(operation, chains, account);
    });

    const eventNotifications = newEvents
      .filter(({ event }) => {
        // Don't notify if the current user caused the event
        if (event.accountId in anyMultisigAccountsMap && event.status !== 'reject') {
          return false;
        }

        return true;
      })
      .map(({ operation, event }) => {
        const signerAccount = anyMultisigAccountsMap[event.accountId];

        return createEventNotification(operation, event, signerAccount?.name);
      });

    return {
      added: [...newOperationNotifications, ...statusChangeNotifications, ...eventNotifications],
      removed: { keys: removedKeys },
    };
  },
  target: spread({
    added: notificationModel.events.notificationsAdded,
    removed: notificationModel.events.notificationsRemoved,
  }),
});

export const $notificationsReady = createStore(false).on(operationChanges, () => true);
