import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { throttle } from 'patronum';

import { localStorageService } from '@/shared/api/local-storage';
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

const NOTIFICATION_EVENTS_KEY = 'notification_events';
const SELECTED_WALLET_IDS_KEY = 'notification_selected_wallet_ids';
const SOUND_ENABLED_KEY = 'notification_sound_enabled';

const SOUND_THROTTLE_MS = 1000;

const ALL_EVENTS = [
  NotificationEvent.WALLET_CREATED,
  NotificationEvent.OPERATION_CREATED,
  NotificationEvent.OPERATION_EXECUTED,
  NotificationEvent.OPERATION_REJECTED,
];

const initialNotificationEvents = localStorageService.getFromStorage(NOTIFICATION_EVENTS_KEY, ALL_EVENTS);
const initialSelectedWalletIds = localStorageService.getFromStorage<ID[] | null>(SELECTED_WALLET_IDS_KEY, null);
const initialSoundEnabled = localStorageService.getFromStorage(SOUND_ENABLED_KEY, false);

const $notifications = createStore<Notification[]>([]);
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));
const $hasUnread = $unreadCount.map((count) => count > 0);

const $notificationEvents = createStore<Set<NotificationEvent>>(new Set(initialNotificationEvents));
const $selectedWalletIds = createStore<Set<ID>>(
  initialSelectedWalletIds === null ? new Set() : new Set(initialSelectedWalletIds),
);
const $soundEnabled = createStore(initialSoundEnabled);

const $hasUserSavedSettings = createStore(initialSelectedWalletIds !== null);

const $wallets = createStore<Wallet[]>([]);
const $knownWalletIds = createStore<Set<ID>>(new Set());
const walletsUpdated = createEvent<Wallet[]>();

sample({
  clock: walletsUpdated,
  target: $wallets,
});

const $enabledAccountIds = combine($wallets, $selectedWalletIds, (wallets, selectedWalletIds): Set<AccountId> => {
  const accountIds = new Set<AccountId>();

  for (const wallet of wallets) {
    if (selectedWalletIds.has(wallet.id)) {
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
  selectedWalletIds: ID[];
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

const saveNotificationEventsFx = createEffect((value: NotificationEvent[]): NotificationEvent[] => {
  return localStorageService.saveToStorage(NOTIFICATION_EVENTS_KEY, value);
});

const saveSelectedWalletIdsFx = createEffect((value: ID[]): ID[] => {
  return localStorageService.saveToStorage(SELECTED_WALLET_IDS_KEY, value);
});

const saveSoundEnabledFx = createEffect((value: boolean): boolean => {
  return localStorageService.saveToStorage(SOUND_ENABLED_KEY, value);
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
  clock: walletsUpdated,
  source: { selectedIds: $selectedWalletIds, hasUserSaved: $hasUserSavedSettings },
  filter: ({ selectedIds, hasUserSaved }, wallets) => !hasUserSaved && selectedIds.size === 0 && wallets.length > 0,
  fn: (_, wallets) => new Set(wallets.map((w) => w.id)),
  target: $selectedWalletIds,
});

sample({
  clock: walletsUpdated,
  source: { selectedIds: $selectedWalletIds, knownWalletIds: $knownWalletIds, hasUserSaved: $hasUserSavedSettings },
  filter: ({ hasUserSaved }, incomingWallets) => hasUserSaved && incomingWallets.length > 0,
  fn: ({ selectedIds, knownWalletIds }, incomingWallets) => {
    const newWalletIds = incomingWallets.filter((w) => !knownWalletIds.has(w.id)).map((w) => w.id);

    if (newWalletIds.length === 0) return selectedIds;

    const updated = new Set(selectedIds);
    for (const id of newWalletIds) {
      updated.add(id);
    }

    return updated;
  },
  target: $selectedWalletIds,
});

sample({
  clock: walletsUpdated,
  fn: (wallets) => new Set(wallets.map((w) => w.id)),
  target: $knownWalletIds,
});

sample({
  clock: settingsSaved,
  fn: ({ notificationEvents }) => new Set(notificationEvents),
  target: $notificationEvents,
});

sample({
  clock: settingsSaved,
  fn: ({ selectedWalletIds }) => new Set(selectedWalletIds),
  target: $selectedWalletIds,
});

sample({
  clock: settingsSaved,
  fn: () => true,
  target: $hasUserSavedSettings,
});

sample({
  clock: settingsSaved,
  fn: ({ notificationEvents }) => notificationEvents,
  target: saveNotificationEventsFx,
});

sample({
  clock: settingsSaved,
  fn: ({ selectedWalletIds }) => selectedWalletIds,
  target: saveSelectedWalletIdsFx,
});

sample({
  clock: settingsSaved,
  fn: ({ soundEnabled }) => soundEnabled,
  target: $soundEnabled,
});

sample({
  clock: settingsSaved,
  fn: ({ soundEnabled }) => soundEnabled,
  target: saveSoundEnabledFx,
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
    existingNotifications: $notifications,
    enabledAccountIds: $enabledAccountIds,
    enabledEventMatchers: $enabledEventMatchers,
  },
  fn: ({ existingNotifications, enabledAccountIds, enabledEventMatchers }, incomingNotifications) => {
    const existingKeys = new Set(existingNotifications.map((n) => n.key));
    const duplicates: string[] = [];

    const newNotifications: CreateNotificationParams[] = [];

    for (const notification of incomingNotifications) {
      if (existingKeys.has(notification.key)) {
        duplicates.push(`${notification.type} (key: ${notification.key})`);
        continue;
      }

      if (!enabledAccountIds.has(notification.issuer)) {
        continue;
      }

      if (!enabledEventMatchers.some((matcher) => matcher(notification))) {
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
  $selectedWalletIds,
  $soundEnabled,

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
