import { format } from 'date-fns/format';
import { enGB } from 'date-fns/locale/en-GB';
import { combine, createEvent, restore } from 'effector';
import { groupBy, orderBy } from 'lodash';
import { debounce } from 'patronum';

import { type Notification } from '@/shared/core';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { walletModel } from '@/entities/wallet';

const queryChanged = createEvent<string>();
const $query = restore(queryChanged, '');
const $debouncedQuery = restore(debounce(queryChanged, 300), '');

type NotificationMeta = {
  chainName: string;
  walletName: string;
  issuerAddress: string;
};

const $filteredNotifications = combine(
  {
    notifications: notificationModel.$notifications,
    query: $debouncedQuery,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  ({ notifications, query, chains, wallets }) => {
    return performSearch<Notification, NotificationMeta>({
      records: notifications,
      query,
      weights: {
        title: 1,
        description: 0.8,
        chainName: 0.7,
        walletName: 0.9,
        issuerAddress: 0.5,
      },
      getMeta: (notification) => {
        const chain = chains[notification.chainId];
        const chainName = chain?.name ?? '';

        const wallet = wallets.find((w) => w.accounts?.some((a) => a.accountId === notification.issuer));
        const walletName = wallet?.name ?? '';

        const issuerAddress = toAddress(notification.issuer, { prefix: chain?.addressPrefix });

        return {
          chainName,
          walletName,
          issuerAddress,
        };
      },
    });
  },
);

const $notificationGroups = combine($filteredNotifications, (notifications) => {
  if (notifications.length === 0) return [];

  const sorted = orderBy(notifications, ['dateCreated'], 'desc');

  const group = groupBy(sorted, ({ dateCreated }) => {
    return format(new Date(dateCreated || 0), 'PP', { locale: enGB });
  });

  return Object.entries(group);
});

const $isSearchEmpty = combine(
  {
    query: $debouncedQuery,
    filtered: $filteredNotifications,
    all: notificationModel.$notifications,
  },
  ({ query, filtered, all }) => query.length > 0 && filtered.length === 0 && all.length > 0,
);

export const notificationListModel = {
  $notificationGroups,
  $query,
  $isSearchEmpty,
  events: {
    queryChanged,
  },
};
