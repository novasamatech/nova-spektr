import { memo } from 'react';

import { type Chain, type ChainId, type Notification, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, Icon } from '@/shared/ui';
import { notificationUtils } from '@/entities/notification';

import { FlexibleMultisigNotification } from './notifies/FlexibleMultisigNotification';
import { MultisigCreatedNotification } from './notifies/MultisigCreatedNotification';
import { MultisigEventNotificationComponent } from './notifies/MultisigEventNotification';
import { MultisigOperationNotificationComponent } from './notifies/MultisigOperationNotification';
import { ProxyCreatedNotification } from './notifies/ProxyCreatedNotification';
import { ProxyRemovedNotification } from './notifies/ProxyRemovedNotification';

type Props = {
  notification: Notification;
  chains: Record<ChainId, Chain>;
  wallets: Wallet[];
};

const NotificationContent = ({ notification, chains, wallets }: Props) => {
  if (notificationUtils.isMultisigInvite(notification)) {
    return <MultisigCreatedNotification notification={notification} />;
  }
  if (notificationUtils.isFlexibleMultisigNotification(notification)) {
    return <FlexibleMultisigNotification notification={notification} />;
  }
  if (notificationUtils.isMultisigOperationNotification(notification)) {
    return <MultisigOperationNotificationComponent notification={notification} chains={chains} wallets={wallets} />;
  }
  if (notificationUtils.isMultisigEventNotification(notification)) {
    return <MultisigEventNotificationComponent notification={notification} chains={chains} wallets={wallets} />;
  }
  if (notificationUtils.isProxyCreation(notification)) {
    return <ProxyCreatedNotification notification={notification} chains={chains} wallets={wallets} />;
  }
  if (notificationUtils.isProxyRemoval(notification)) {
    return <ProxyRemovedNotification notification={notification} chains={chains} wallets={wallets} />;
  }
  if (notificationUtils.isDraftNotification(notification)) {
    return (
      <div className="flex gap-x-2">
        <Icon name="document" size={20} className="text-icon-accent" />
        <BodyText>{notification.title}</BodyText>
      </div>
    );
  }

  return null;
};

export const NotificationRow = memo(({ notification, chains, wallets }: Props) => {
  const { formatDate } = useI18n();

  return (
    <li className="flex justify-between rounded-sm bg-block-background-default p-4">
      <NotificationContent notification={notification} chains={chains} wallets={wallets} />
      <FootnoteText className="text-text-tertiary">{formatDate(new Date(notification.dateCreated), 'p')}</FootnoteText>
    </li>
  );
});
