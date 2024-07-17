import { ReactNode } from 'react';

import { FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigCreatedNotification } from './notifies/MultisigCreatedNotification';
import { ProxyCreatedNotification } from './notifies/ProxyCreatedNotification';
import { ProxyRemovedNotification } from './notifies/ProxyRemovedNotification';
import type { Notification, MultisigCreated, ProxyAction } from '@shared/core';
import { NotificationType } from '@shared/core';

const Notifications: Record<NotificationType, (n: Notification) => ReactNode> = {
  [NotificationType.MULTISIG_CREATED]: (n) => <MultisigCreatedNotification notification={n as MultisigCreated} />,
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
    <li className="bg-block-background-default rounded p-4 flex justify-between">
      {Notifications[notification.type](notification)}
      <FootnoteText className="text-text-tertiary">
        {formatDate(new Date(notification.dateCreated || 0), 'p')}
      </FootnoteText>
    </li>
  );
};
