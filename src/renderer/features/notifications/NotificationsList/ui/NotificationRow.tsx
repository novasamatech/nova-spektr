import { format } from 'date-fns';
import { ReactNode } from 'react';

import { FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { MultisigInviteNotification } from './notifies/MultisigInviteNotification';
import { ProxyCreatedNotification } from './notifies/ProxyCreatedNotification';
import { NotificationType } from '@shared/core';
import type { Notification, MultisigInvite, ProxyCreated } from '@shared/core';

const Notifications: Record<NotificationType, (notify: Notification) => ReactNode> = {
  [NotificationType.MULTISIG_INVITE]: (notify) => (
    <MultisigInviteNotification notification={notify as MultisigInvite} />
  ),
  [NotificationType.MULTISIG_CREATED]: () => null,
  [NotificationType.MULTISIG_APPROVED]: () => null,
  [NotificationType.MULTISIG_CANCELLED]: () => null,
  [NotificationType.MULTISIG_EXECUTED]: () => null,
  [NotificationType.PROXY_CREATED]: (notify) => <ProxyCreatedNotification notification={notify as ProxyCreated} />,
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
