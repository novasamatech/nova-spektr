import { type ReactNode } from 'react';

import { type FlexibleMultisigCreated, type MultisigCreated, type Notification, type ProxyAction } from '@/shared/core';
import { NotificationType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';

import { FlexibleMultisigCreatedNotification } from './notifies/FlexibleMultisigCreatedNotification';
import { MultisigCreatedNotification } from './notifies/MultisigCreatedNotification';
import { ProxyCreatedNotification } from './notifies/ProxyCreatedNotification';
import { ProxyRemovedNotification } from './notifies/ProxyRemovedNotification';

const Notifications: Record<NotificationType, (n: Notification) => ReactNode> = {
  [NotificationType.MULTISIG_CREATED]: (n) => <MultisigCreatedNotification notification={n as MultisigCreated} />,
  [NotificationType.FLEXIBLE_MULTISIG_CREATED]: (n) => (
    <FlexibleMultisigCreatedNotification notification={n as FlexibleMultisigCreated} />
  ),
  [NotificationType.MULTISIG_APPROVED]: () => null,
  [NotificationType.MULTISIG_CANCELLED]: () => null,
  [NotificationType.MULTISIG_EXECUTED]: () => null,
  [NotificationType.PROXY_CREATED]: (n) => <ProxyCreatedNotification notification={n as ProxyAction} />,
  [NotificationType.PROXY_REMOVED]: (n) => <ProxyRemovedNotification notification={n as ProxyAction} />,
};

type Props = {
  notification: Notification;
};

export const NotificationRow = ({ notification }: Props) => {
  const { formatDate } = useI18n();

  return (
    <li className="flex justify-between rounded bg-block-background-default p-4">
      {Notifications[notification.type](notification)}
      <FootnoteText className="text-text-tertiary">
        {formatDate(new Date(notification.dateCreated || 0), 'p')}
      </FootnoteText>
    </li>
  );
};
