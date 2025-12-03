import { format } from 'date-fns/format';
import { enGB } from 'date-fns/locale/en-GB';
import { combine, createEvent, createStore } from 'effector';
import { groupBy } from 'lodash';

import { type Notification } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { identity } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { walletModel } from '@/entities/wallet';

const queryChanged = createEvent<string>();
const pageOpened = createEvent();
const $query = createStore<string>('')
  .on(queryChanged, (_, query) => query)
  .reset(pageOpened);

const $notificationGroups = combine(
  {
    notifications: notificationModel.$notifications,
    query: $query,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
    identities: identity.$list,
  },
  ({ notifications, query, chains, wallets, identities }) => {
    if (notifications.length === 0) return [];

    const filteredNotifications = performSearch({
      records: notifications,
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
    pageOpened,
  },
};
