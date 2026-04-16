import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';
import { format } from 'date-fns/format';
import { enGB } from 'date-fns/locale/en-GB';
import { combine, createEvent, createStore, restore } from 'effector';
import { groupBy, orderBy } from 'lodash';
import { debounce } from 'patronum';

import { type Notification, NotificationType } from '@/shared/core';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { type DateRange } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { notificationModel, notificationUtils } from '@/entities/notification';
import { walletModel } from '@/entities/wallet';

const queryChanged = createEvent<string>();
const dateRangeChanged = createEvent<DateRange | undefined>();
const $query = restore(queryChanged, '');
const $debouncedQuery = restore(debounce(queryChanged, 300), '');
const $dateRange = createStore<DateRange | undefined>(undefined, { skipVoid: false }).on(
  dateRangeChanged,
  (_, range) => range,
);

function matchesDateRange(notification: Notification, dateRange: DateRange | undefined): boolean {
  if (!dateRange?.from && !dateRange?.to) return true;

  const { from, to } = dateRange;
  const date = new Date(notification.dateCreated);

  if (from && to) {
    return isWithinInterval(date, { start: startOfDay(from), end: endOfDay(to) });
  }
  if (from) {
    return isAfter(date, startOfDay(from)) || date.getTime() === startOfDay(from).getTime();
  }

  return true;
}

const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.MULTISIG_CREATED]: 'multisig created',
  [NotificationType.MULTISIG_APPROVED]: 'multisig approved',
  [NotificationType.MULTISIG_EXECUTED]: 'multisig executed',
  [NotificationType.MULTISIG_CANCELLED]: 'multisig cancelled',
  [NotificationType.FLEXIBLE_MULTISIG_CREATED]: 'flexible multisig created',
  [NotificationType.FLEXIBLE_MULTISIG_EDITED]: 'flexible multisig edited',
  [NotificationType.PROXY_CREATED]: 'proxy created',
  [NotificationType.PROXY_REMOVED]: 'proxy removed',
  [NotificationType.MULTISIG_OPERATION]: 'multisig operation',
  [NotificationType.MULTISIG_EVENT]: 'multisig event',
  [NotificationType.DRAFT_CHANGE]: 'draft',
};

type NotificationMeta = {
  chainName: string;
  walletName: string;
  issuerAddress: string;
  multisigAccountName: string;
  accountName: string;
  proxyType: string;
  statusText: string;
  typeText: string;
};

const $filteredNotifications = combine(
  {
    notifications: notificationModel.$notifications,
    query: $debouncedQuery,
    dateRange: $dateRange,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  ({ notifications, query, dateRange, chains, wallets }) => {
    const dateFiltered = notifications.filter((n) => matchesDateRange(n, dateRange));

    return performSearch<Notification, NotificationMeta>({
      records: dateFiltered,
      query,
      weights: {
        title: 1,
        description: 0.8,
        chainName: 0.7,
        walletName: 0.9,
        issuerAddress: 0.5,
        multisigAccountName: 0.8,
        accountName: 0.8,
        proxyType: 0.6,
        statusText: 0.6,
        typeText: 0.7,
      },
      getMeta: (notification) => {
        const chain = chains[notification.chainId];
        const chainName = chain?.name ?? '';

        const wallet = wallets.find((w) => w.accounts.some((a) => a.accountId === notification.issuer));
        const walletName = wallet?.name ?? '';

        const issuerAddress = toAddress(notification.issuer, { prefix: chain?.addressPrefix });

        const multisigAccountName = notificationUtils.isMultisigInvite(notification)
          ? notification.multisigAccountName
          : '';

        const accountName = notificationUtils.isFlexibleMultisigNotification(notification)
          ? notification.accountName
          : '';

        const proxyType =
          notificationUtils.isProxyCreation(notification) || notificationUtils.isProxyRemoval(notification)
            ? notification.proxyType
            : '';

        const statusText = notification.status;
        const typeText = notificationTypeLabels[notification.type] ?? '';

        return {
          chainName,
          walletName,
          issuerAddress,
          multisigAccountName,
          accountName,
          proxyType,
          statusText,
          typeText,
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
    dateRange: $dateRange,
    filtered: $filteredNotifications,
    all: notificationModel.$notifications,
  },
  ({ query, dateRange, filtered, all }) => {
    const hasActiveFilter = query.length > 0 || Boolean(dateRange?.from || dateRange?.to);

    return hasActiveFilter && filtered.length === 0 && all.length > 0;
  },
);

export const notificationListModel = {
  $notificationGroups,
  $query,
  $dateRange,
  $isSearchEmpty,
  events: {
    queryChanged,
    dateRangeChanged,
  },
};
