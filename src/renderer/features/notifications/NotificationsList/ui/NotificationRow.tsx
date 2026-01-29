import { type ReactNode } from 'react';

import {
  type FlexibleMultisigOperationNotification,
  type MultisigCreated,
  type MultisigEventNotification as MultisigEventNotificationType,
  type MultisigOperationNotification as MultisigOperationNotificationType,
  type Notification,
  type ProxyAction,
} from '@/shared/core';
import { NotificationType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';

import { FlexibleMultisigNotification } from './notifies/FlexibleMultisigNotification';
import { MultisigCreatedNotification } from './notifies/MultisigCreatedNotification';
import { MultisigEventNotificationComponent } from './notifies/MultisigEventNotification';
import { MultisigOperationNotificationComponent } from './notifies/MultisigOperationNotification';
import { ProxyCreatedNotification } from './notifies/ProxyCreatedNotification';
import { ProxyRemovedNotification } from './notifies/ProxyRemovedNotification';

const Notifications: Record<NotificationType, (n: Notification) => ReactNode> = {
  [NotificationType.MULTISIG_CREATED]: (n) => <MultisigCreatedNotification notification={n as MultisigCreated} />,
  [NotificationType.FLEXIBLE_MULTISIG_CREATED]: (n) => (
    <FlexibleMultisigNotification notification={n as FlexibleMultisigOperationNotification} />
  ),
  [NotificationType.FLEXIBLE_MULTISIG_EDITED]: (n) => (
    <FlexibleMultisigNotification notification={n as FlexibleMultisigOperationNotification} />
  ),
  [NotificationType.MULTISIG_APPROVED]: () => null,
  [NotificationType.MULTISIG_CANCELLED]: () => null,
  [NotificationType.MULTISIG_EXECUTED]: () => null,
  [NotificationType.MULTISIG_OPERATION]: (n) => (
    <MultisigOperationNotificationComponent notification={n as MultisigOperationNotificationType} />
  ),
  [NotificationType.MULTISIG_EVENT]: (n) => (
    <MultisigEventNotificationComponent notification={n as MultisigEventNotificationType} />
  ),
  [NotificationType.PROXY_CREATED]: (n) => <ProxyCreatedNotification notification={n as ProxyAction} />,
  [NotificationType.PROXY_REMOVED]: (n) => <ProxyRemovedNotification notification={n as ProxyAction} />,
};

type Props = {
  notification: Notification;
};

export const NotificationRow = ({ notification }: Props) => {
  const { formatDate } = useI18n();

  const renderNotification = Notifications[notification.type];
  if (!renderNotification) {
    return null;
  }

  return (
    <li className="flex justify-between rounded-sm bg-block-background-default p-4">
      {renderNotification(notification)}
      <FootnoteText className="text-text-tertiary">
        {formatDate(new Date(notification.dateCreated), 'p')}
      </FootnoteText>
    </li>
  );
};
