import { sample } from 'effector';
import { spread } from 'patronum';

import { NotificationType } from '@/shared/core';
import { pairwise } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  multisigOperation,
  multisigOperationService,
} from '@/domains/network';
import { notificationModel } from '@/entities/notification';

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
  source: { populated: multisigOperation.$populated, accountsList: accounts.$list },
  filter: ({ populated }) => populated,
  fn: ({ accountsList }, { added, removedKeys }) => {
    const accountsMap = new Map<AccountId, AnyAccount>(
      accountsList.map((account: AnyAccount) => [account.accountId, account]),
    );

    const notificationsToAdd = added
      .filter(operation => {
        const account = accountsMap.get(operation.accountId);

        return !account?.createdAt || operation.timestamp >= account.createdAt;
      })
      .map(operation => {
        const account = accountsMap.get(operation.accountId);

        return multisigOperationService.createOperationNotification(operation, account?.name);
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
