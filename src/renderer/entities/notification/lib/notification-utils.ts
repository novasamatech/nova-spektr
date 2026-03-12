import {
  type FlexibleMultisigOperationNotification,
  type MultisigCreated,
  type MultisigEventNotification,
  type MultisigOperationNotification,
  type Notification,
  type ProxyAction,
} from '@/shared/core';
import { NotificationType } from '@/shared/core';

export const notificationUtils = {
  isMultisigInvite,
  isMultisigOperation,
  isMultisigOperationNotification,
  isMultisigEventNotification,
  isFlexibleMultisigNotification,
  isProxyCreation,
  isProxyRemoval,
};

function isMultisigInvite(notification: Notification): notification is MultisigCreated {
  return notification.type === NotificationType.MULTISIG_CREATED;
}

function isMultisigOperation(notification: Notification): notification is MultisigOperationNotification {
  const Operations = [
    NotificationType.MULTISIG_CREATED,
    NotificationType.MULTISIG_APPROVED,
    NotificationType.MULTISIG_CANCELLED,
    NotificationType.MULTISIG_EXECUTED,
  ];

  return Operations.includes(notification.type);
}

function isMultisigOperationNotification(notification: Notification): notification is MultisigOperationNotification {
  return notification.type === NotificationType.MULTISIG_OPERATION;
}

function isMultisigEventNotification(notification: Notification): notification is MultisigEventNotification {
  return notification.type === NotificationType.MULTISIG_EVENT;
}

function isFlexibleMultisigNotification(
  notification: Notification,
): notification is FlexibleMultisigOperationNotification {
  return (
    notification.type === NotificationType.FLEXIBLE_MULTISIG_CREATED ||
    notification.type === NotificationType.FLEXIBLE_MULTISIG_EDITED
  );
}

function isProxyCreation(notification: Notification): notification is ProxyAction {
  return notification.type === NotificationType.PROXY_CREATED;
}

function isProxyRemoval(notification: Notification): notification is ProxyAction {
  return notification.type === NotificationType.PROXY_REMOVED;
}
