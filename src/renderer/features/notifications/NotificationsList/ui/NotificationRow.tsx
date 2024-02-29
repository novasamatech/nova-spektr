import { format } from 'date-fns';
import { ReactNode } from 'react';

import { FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigInviteNotification } from './notifies/MultisigInviteNotification';
import { ProxyCreatedNotification } from './notifies/ProxyCreatedNotification';
import { ProxyRemovedNotification } from './notifies/ProxyRemovedNotification';
import type { Notification, MultisigInvite, ProxyAction } from '@shared/core';
import { NotificationType } from '@shared/core';

const Notifications: Record<NotificationType, (n: Notification) => ReactNode> = {
  [NotificationType.MULTISIG_INVITE]: (n) => <MultisigInviteNotification notification={n as MultisigInvite} />,
  [NotificationType.MULTISIG_CREATED]: () => null,
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
  const { dateLocale } = useI18n();

  return (
    <li className="bg-block-background-default rounded p-4 flex justify-between">
      {Notifications[notification.type](notification)}
      <FootnoteText className="text-text-tertiary">
        {format(new Date(notification.dateCreated || 0), 'p', { locale: dateLocale })}
      </FootnoteText>
    </li>
  );
};
