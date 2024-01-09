import { NotificationType } from '@shared/core';
import type { Notification, MultisigInvite, MultisigOperation, ProxyCreated } from '@shared/core';

export const notificationUtils = {
  isMultisigInvite,
  isMultisigOperation,
  isProxyCreation,
};

function isMultisigInvite(notification: Notification): notification is MultisigInvite {
  return notification.type === NotificationType.MULTISIG_INVITE;
}

function isMultisigOperation(notification: Notification): notification is MultisigOperation {
  const Operations = [
    NotificationType.MULTISIG_CREATED,
    NotificationType.MULTISIG_APPROVED,
    NotificationType.MULTISIG_CANCELLED,
    NotificationType.MULTISIG_EXECUTED,
  ];

  return Operations.includes(notification.type);
}

function isProxyCreation(notification: Notification): notification is ProxyCreated {
  return notification.type === NotificationType.MULTISIG_INVITE;
}
