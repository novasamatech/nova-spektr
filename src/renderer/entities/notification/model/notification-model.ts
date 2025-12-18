import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { throttle } from 'patronum';

import { storageService } from '@/shared/api/storage';
import {
  type CreateNotificationParams,
  type ID,
  type NoID,
  type Notification,
  NotificationEvent,
  type NotificationStatus,
  NotificationType,
  type Wallet,
} from '@/shared/core';
import { createBuffer } from '@/shared/effector';
import { merge } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

const SOUND_THROTTLE_MS = 1000;

const ALL_EVENTS = [
  NotificationEvent.WALLET_CREATED,
  NotificationEvent.OPERATION_CREATED,
  NotificationEvent.OPERATION_EXECUTED,
  NotificationEvent.OPERATION_REJECTED,
];

type NotificationSettings = {
  notificationEvents: NotificationEvent[];
  disabledWalletIds: ID[];
  soundEnabled: boolean;
};

const $notifications = createStore<Notification[]>([]);
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));
const $hasUnread = $unreadCount.map((count) => count > 0);

const $settings = createStore<NotificationSettings>({
  notificationEvents: ALL_EVENTS,
  disabledWalletIds: [],
  soundEnabled: false,
});

persist({
  key: 'notification_settings',
  store: $settings,
  sync: true,
});

const $notificationEvents = $settings.map(({ notificationEvents }) => new Set(notificationEvents));
const $disabledWalletIds = $settings.map(({ disabledWalletIds }) => new Set(disabledWalletIds));
const $soundEnabled = $settings.map(({ soundEnabled }) => soundEnabled);

const $wallets = createStore<Wallet[]>([]);
const walletsUpdated = createEvent<Wallet[]>();

sample({
  clock: walletsUpdated,
  target: $wallets,
});

const $disabledAccountIds = combine($wallets, $disabledWalletIds, (wallets, disabledWalletIds): Set<AccountId> => {
  const accountIds = new Set<AccountId>();

  for (const wallet of wallets) {
    if (disabledWalletIds.has(wallet.id)) {
      for (const account of wallet.accounts) {
        accountIds.add(account.accountId);
      }
    }
  }

  return accountIds;
});

const EVENT_MATCHERS: Record<NotificationEvent, (n: CreateNotificationParams) => boolean> = {
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

type EventMatcher = (n: CreateNotificationParams) => boolean;

const $enabledEventMatchers = $notificationEvents.map((enabledEvents): EventMatcher[] => {
  const matchers: EventMatcher[] = [];

  for (const event of enabledEvents) {
    const matcher = EVENT_MATCHERS[event];
    if (matcher) {
      matchers.push(matcher);
    }
  }

  return matchers;
});

const notificationsAdded = createEvent<CreateNotificationParams[]>();
const notificationsFiltered = createEvent<CreateNotificationParams[]>();
const notificationsViewed = createEvent();
const notificationEdited = createEvent<Notification>();

const settingsSaved = createEvent<{
  disabledWalletIds: ID[];
  notificationEvents: NotificationEvent[];
  soundEnabled: boolean;
}>();
const soundPlayed = createEvent();

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect(async (notifications: CreateNotificationParams[]): Promise<Notification[]> => {
  const notificationsWithMetadata: NoID<Notification>[] = notifications.map((notification) => ({
    ...notification,
    read: false,
    dateCreated: Date.now(),
  }));

  return storageService.notifications.createAll(notificationsWithMetadata).then((r) => r ?? []);
});

const markAllAsReadFx = createEffect((notifications: Notification[]): Promise<Notification[]> => {
  const updates = notifications.map((n) => ({ ...n, read: true }));

  return storageService.notifications.updateAll(updates).then(() => updates);
});

const editNotificationFx = createEffect((notification: Notification): Promise<Notification> => {
  return storageService.notifications.update(notification.id, notification).then(() => notification);
});

const playSoundFx = createEffect(async (): Promise<void> => {
  const audio = new Audio(new URL('../../../shared/assets/sounds/notification.mp3', import.meta.url).href);
  await audio.play();
});

const playSoundRequested = createEvent();

const playSoundThrottled = throttle(playSoundRequested, SOUND_THROTTLE_MS);

sample({
  clock: playSoundThrottled,
  target: playSoundFx,
});

sample({
  clock: settingsSaved,
  target: $settings,
});

sample({
  clock: settingsSaved,
  source: $soundEnabled,
  filter: (wasEnabled, { soundEnabled }) => !wasEnabled && soundEnabled,
  target: playSoundFx,
});

sample({
  clock: notificationsFiltered,
  source: $soundEnabled,
  filter: (soundEnabled, notifications) => soundEnabled && notifications.length > 0,
  target: playSoundRequested,
});

sample({
  clock: soundPlayed,
  target: playSoundFx,
});

sample({
  clock: populateNotificationsFx.doneData,
  target: $notifications,
});

sample({
  clock: notificationsAdded,
  source: {
    notifications: $notifications,
    disabledAccountIds: $disabledAccountIds,
    enabledEventMatchers: $enabledEventMatchers,
  },
  fn: ({ notifications, disabledAccountIds, enabledEventMatchers }, incomingNotifications) => {
    const existingKeys = new Set(notifications.map((n) => n.key));
    const newNotifications: CreateNotificationParams[] = [];

    for (const notification of incomingNotifications) {
      if (existingKeys.has(notification.key)) {
        // filter out duplicates
        continue;
      }
      if (disabledAccountIds.has(notification.issuer)) {
        // filter out disabled accounts
        continue;
      }
      if (!enabledEventMatchers.some((matcher) => matcher(notification))) {
        // filter out disabled events
        continue;
      }

      newNotifications.push(notification);
    }

    return newNotifications;
  },
  target: notificationsFiltered,
});

sample({
  clock: notificationsFiltered,
  filter: (notifications) => notifications.length > 0,
  target: addNotificationsFx,
});

sample({
  clock: addNotificationsFx.doneData,
  source: $notifications,
  fn: (notifications, notification) => notifications.concat(notification),
  target: $notifications,
});

const batchedNotifications = createBuffer({
  source: notificationsFiltered.map((ns) => ns).filterMap((ns) => (ns.length > 0 ? ns : undefined)),
  timeframe: 1000,
}).map((batches): ToastData[] => {
  const notifications = batches.flat();
  const grouped = new Map<NotificationType, CreateNotificationParams[]>();

  for (const notification of notifications) {
    const existing = grouped.get(notification.type) ?? [];
    grouped.set(notification.type, [...existing, notification]);
  }

  const toasts: ToastData[] = [];
  for (const [, items] of grouped) {
    if (items.length > 1) {
      const first = items[0];
      const batchParams = first.batch;

      toasts.push({
        title: batchParams.title,
        description: batchParams.description,
        status: first.status,
        link: batchParams.link,
        count: items.length,
      });
    } else {
      const item = items[0];
      toasts.push({ ...item });
    }
  }

  return toasts;
});

const $toasts = createStore<ToastData[]>([]).on(batchedNotifications, (_, update) => update);

export type ToastData = {
  title: string;
  description?: string;
  status: NotificationStatus;
  link?: {
    title: string;
    path: string;
  };
  count?: number;
};

sample({
  clock: notificationsViewed,
  source: $notifications,
  filter: (ids) => ids.length > 0,
  fn: (notifications) => notifications.filter((n) => !n.read),
  target: markAllAsReadFx,
});

sample({
  clock: markAllAsReadFx.doneData,
  source: $notifications,
  fn: (all, readed) => {
    return merge({
      a: all,
      b: readed,
      mergeBy: (a) => a.id,
    });
  },
  target: $notifications,
});

sample({
  clock: notificationEdited,
  target: editNotificationFx,
});

sample({
  clock: editNotificationFx.doneData,
  source: $notifications,
  fn: (notifications, editedNotification) => {
    return notifications.map((n) => (n.id === editedNotification.id ? editedNotification : n));
  },
  target: $notifications,
});

export const notificationModel = {
  $notifications,
  $hasUnread,
  $unreadCount,
  $toasts,

  $notificationEvents,
  $disabledWalletIds,
  $soundEnabled,
  $settings,

  events: {
    notificationsStarted: populateNotificationsFx,
    notificationsAdded,
    notificationsViewed,
    notificationEdited,
    notificationsSaved: addNotificationsFx.doneData,
    settingsSaved,
    walletsUpdated,
    soundPlayed,
  },
};
