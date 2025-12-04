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
const pageOpened = createEvent();
const $query = createStore<string>('')
  .on(queryChanged, (_, query) => query)
  .reset(pageOpened);

type NotificationFilter = (notification: Notification) => boolean;

// Source type matchers
const isWalletNotification: NotificationFilter = (notification) =>
  [
    NotificationType.MULTISIG_CREATED,
    NotificationType.FLEXIBLE_MULTISIG_CREATED,
    NotificationType.FLEXIBLE_MULTISIG_EDITED,
    NotificationType.PROXY_CREATED,
    NotificationType.PROXY_REMOVED,
  ].includes(notification.type);

const isOperationNotification: NotificationFilter = (notification) =>
  notification.type === NotificationType.MULTISIG_OPERATION;

// Event type matchers configuration
const EVENT_MATCHERS: Record<NotificationEvent, NotificationFilter> = {
  [NotificationEvent.WALLET_CREATED]: (n) =>
    [
      NotificationType.MULTISIG_CREATED,
      NotificationType.FLEXIBLE_MULTISIG_CREATED,
      NotificationType.PROXY_CREATED,
    ].includes(n.type),
  [NotificationEvent.OPERATION_CREATED]: (n) => n.type === NotificationType.MULTISIG_OPERATION && n.status === 'info',
  [NotificationEvent.OPERATION_EXECUTED]: (n) =>
    n.type === NotificationType.MULTISIG_OPERATION && n.status === 'success',
  [NotificationEvent.OPERATION_REJECTED]: (n) => n.type === NotificationType.MULTISIG_OPERATION && n.status === 'error',
};

// Filter factories
const createSourceFilter = (source: NotificationSource): NotificationFilter => {
  if (source === NotificationSource.OPERATIONS) return isOperationNotification;
  if (source === NotificationSource.WALLETS) return isWalletNotification;
  return () => true;
};

const createEventFilter = (enabledEvents: Set<NotificationEvent>): NotificationFilter => {
  return (notification) => {
    for (const [event, matcher] of Object.entries(EVENT_MATCHERS)) {
      if (matcher(notification) && !enabledEvents.has(event as NotificationEvent)) {
        return false;
      }
    }
    return true;
  };
};

const composeFilters = (...filters: NotificationFilter[]): NotificationFilter => {
  return (notification) => filters.every((filter) => filter(notification));
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

    const sourceFilter = createSourceFilter(source);
    const eventFilter = createEventFilter(events);
    const combinedFilter = composeFilters(sourceFilter, eventFilter);

    const filtered = notifications.filter(combinedFilter);

    const searched = performSearch({
      records: filtered,
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

    const sorted = searched.sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0));

    const grouped = groupBy(sorted, ({ dateCreated }) => {
      return format(new Date(dateCreated || 0), 'PP', { locale: enGB });
    });

    return Object.entries(grouped);
  },
);

export const notificationListModel = {
  $notificationGroups,
  events: {
    queryChanged,
    pageOpened,
  },
};
