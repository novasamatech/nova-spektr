import { sample } from 'effector';
import { spread } from 'patronum';

import { NotificationType } from '@/shared/core';
import { pairwise } from '@/shared/effector';
import {
  type MultisigEvent,
  type MultisigOperation,
  accounts,
  multisigOperation,
  multisigOperationService,
} from '@/domains/network';
import { notificationModel } from '@/entities/notification';

type NewEvent = {
  operation: MultisigOperation;
  event: MultisigEvent;
};

const $accountsMap = accounts.$list.map(
  accountsList => new Map(accountsList.map(account => [account.accountId, account])),
);

const getOperationId = (op: MultisigOperation) =>
  multisigOperationService.getOperationId(op.chainId, op.callHash, op.accountId, op.blockCreated, op.indexCreated);

const getNotificationKey = (op: MultisigOperation) =>
  `${NotificationType.MULTISIG_OPERATION}-${getOperationId(op)}-${op.status}`;

const operationChanges = pairwise(multisigOperation.$list)
  .map(({ prev: prevState, current: update }) => {
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

    return { added, removedKeys, newEvents };
  })
  .filter({
    fn: ({ added, removedKeys, newEvents }) => added.length > 0 || removedKeys.length > 0 || newEvents.length > 0,
  });

sample({
  clock: operationChanges,
  source: { populated: multisigOperation.$populated, accountsMap: $accountsMap },
  filter: ({ populated }) => populated,
  fn: ({ accountsMap }, { added, removedKeys, newEvents }) => {
    const operationNotifications = added
      .filter(operation => {
        // Don't notify the operation creator
        if (operation.status === 'pending' && accountsMap.has(operation.depositor)) {
          return false;
        }

        const account = accountsMap.get(operation.accountId);
        // Show only new operations
        return !account?.createdAt || operation.timestamp >= account.createdAt;
      })
      .map(operation => {
        const account = accountsMap.get(operation.accountId);

        return multisigOperationService.createOperationNotification(operation, account?.name);
      });

    const eventNotifications = newEvents
      .filter(({ event }) => {
        // Don't notify if the current user caused the event
        if (accountsMap.has(event.accountId)) {
          return false;
        }

        return true;
      })
      .map(({ operation, event }) => {
        const signerAccount = accountsMap.get(event.accountId);

        return multisigOperationService.createEventNotification(operation, event, signerAccount?.name);
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
