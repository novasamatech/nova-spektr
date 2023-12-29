import { MultisigNotificationType, Notification, ProxyNotificationType } from '@entities/notification';
import { MultisigInvitedNotification } from './ui/MultisigInvitedNotification';
import { ProxyCreatedNotification } from './ui/ProxyCreatedNotification';

type Props = {
  notification: Notification;
};

export const NotificationProvider = ({ notification }: Props) => {
  return {
    [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification) => <MultisigInvitedNotification notification={n} />,
    [MultisigNotificationType.MST_CREATED]: () => null,
    [MultisigNotificationType.MST_APPROVED]: () => null,
    [MultisigNotificationType.MST_EXECUTED]: () => null,
    [MultisigNotificationType.MST_CANCELLED]: () => null,
    [ProxyNotificationType.PROXY_CREATED]: (n: Notification) => (
      <ProxyCreatedNotification notification={notification} />
    ),
  }[notification.type](notification);
};
