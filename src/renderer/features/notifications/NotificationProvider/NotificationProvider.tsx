import { MultisigNotificationType, Notification, ProxyNotificationType } from '@entities/notification';
import { MultisigInvitedNotification } from './components/MultisigInvitedNotification';
import { ProxyCreatedNotification } from './components/ProxyCreatedNotification';

type Props = {
  notification: Notification;
};

export const NotificationProvider = ({ notification }: Props) =>
  ({
    [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification) => <MultisigInvitedNotification notification={n} />,
    [MultisigNotificationType.MST_CREATED]: () => <></>,
    [MultisigNotificationType.MST_APPROVED]: () => <></>,
    [MultisigNotificationType.MST_EXECUTED]: () => <></>,
    [MultisigNotificationType.MST_CANCELLED]: () => <></>,
    [ProxyNotificationType.PROXY_CREATED]: (n: Notification) => (
      <ProxyCreatedNotification notification={notification} />
    ),
  }[notification.type](notification));
