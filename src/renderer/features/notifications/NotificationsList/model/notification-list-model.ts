import { format } from 'date-fns/format';
import { enGB } from 'date-fns/locale/en-GB';
import { combine, createEvent, createStore } from 'effector';
import { groupBy } from 'lodash';

import { type Notification, NotificationType } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { identity } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { walletModel } from '@/entities/wallet';
import { NotificationEvent, NotificationSource, notificationsSettingsModel } from '../../NotificationsSettings';

const queryChanged = createEvent<string>();
const $query = createStore<string>('').on(queryChanged, (_, query) => query);

const isWalletNotification = (notification: Notification): boolean => {
  return [
    NotificationType.MULTISIG_CREATED,
    NotificationType.FLEXIBLE_MULTISIG_CREATED,
    NotificationType.FLEXIBLE_MULTISIG_EDITED,
    NotificationType.PROXY_CREATED,
    NotificationType.PROXY_REMOVED,
  ].includes(notification.type);
};

const isOperationNotification = (notification: Notification): boolean => {
  return notification.type === NotificationType.MULTISIG_OPERATION;
};

const matchesEventFilter = (notification: Notification, events: Set<NotificationEvent>): boolean => {
  if (notification.type === NotificationType.MULTISIG_OPERATION) {
    const opNotification = notification as Notification & { operationStatus?: string };
    if (opNotification.operationStatus === 'created' && !events.has(NotificationEvent.OPERATION_CREATED)) {
      return false;
    }
    if (opNotification.operationStatus === 'executed' && !events.has(NotificationEvent.OPERATION_EXECUTED)) {
      return false;
    }
    if (opNotification.operationStatus === 'cancelled' && !events.has(NotificationEvent.OPERATION_REJECTED)) {
      return false;
    }
  } else if (isWalletNotification(notification)) {
    if (
      [
        NotificationType.MULTISIG_CREATED,
        NotificationType.FLEXIBLE_MULTISIG_CREATED,
        NotificationType.PROXY_CREATED,
      ].includes(notification.type) &&
      !events.has(NotificationEvent.WALLET_CREATED)
    ) {
      return false;
    }
  }
  return true;
};

const $notificationGroups = combine(
  {
    notifications: notificationModel.$notifications,
    query: $query,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
    identities: identity.$list,
    source: notificationsSettingsModel.$notificationSource,
    events: notificationsSettingsModel.$notificationEvents,
  },
  ({ notifications, query, chains, wallets, identities, source, events }) => {
    if (notifications.length === 0) return [];

    let sourceFiltered = notifications;

    if (source === NotificationSource.OPERATIONS) {
      sourceFiltered = notifications.filter(isOperationNotification);
    } else if (source === NotificationSource.WALLETS) {
      sourceFiltered = notifications.filter(isWalletNotification);
    }

    const eventFiltered = sourceFiltered.filter((notification) => matchesEventFilter(notification, events));

    const filteredNotifications = performSearch({
      records: eventFiltered,
      query,
      getMeta: (notification: Notification) => {
        const issuerWallet = wallets.find((w) => w.accounts.some((acc) => acc.accountId === notification.issuer));
        const issuerAccount = issuerWallet?.accounts.find((acc) => acc.accountId === notification.issuer);

        return {
          issuerWalletName: issuerWallet?.name,
          issuerAccountName: issuerAccount?.name,
          issuerIdentityName: identities[notification.chainId]?.[notification.issuer]?.name,
          chainName: notification.chainId && chains[notification.chainId]?.name,
        };
      },
      weights: {
        title: 1,
        type: 0.8,
        description: 0.7,
        issuerAccountName: 0.6,
        issuerWalletName: 0.5,
        issuerIdentityName: 0.5,
        chainName: 0.4,
      },
    });

    const sorted = filteredNotifications.sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0));

    const group = groupBy(sorted, ({ dateCreated }) => {
      return format(new Date(dateCreated || 0), 'PP', { locale: enGB });
    });

    return Object.entries(group);
  },
);

export const notificationListModel = {
  $notificationGroups,
  events: {
    queryChanged,
  },
};
