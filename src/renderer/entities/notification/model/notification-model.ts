import { combine, createEffect, createEvent, createStore, sample } from 'effector';

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

// LocalStorage keys for settings persistence
const NOTIFICATION_EVENTS_KEY = 'notification_events';
const SELECTED_WALLET_IDS_KEY = 'notification_selected_wallet_ids';

// Default events (all enabled)
const ALL_EVENTS = [
  NotificationEvent.WALLET_CREATED,
  NotificationEvent.OPERATION_CREATED,
  NotificationEvent.OPERATION_EXECUTED,
  NotificationEvent.OPERATION_REJECTED,
];

// Load initial values from localStorage
const initialNotificationEvents = localStorageService.getFromStorage(NOTIFICATION_EVENTS_KEY, ALL_EVENTS);
const initialSelectedWalletIds = localStorageService.getFromStorage<ID[] | null>(SELECTED_WALLET_IDS_KEY, null);

// ==================== Notifications State ====================

const $notifications = createStore<Notification[]>([]);
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));
const $hasUnread = $unreadCount.map((count) => count > 0);

// ==================== Settings State ====================

const $notificationEvents = createStore<Set<NotificationEvent>>(new Set(initialNotificationEvents));
const $selectedWalletIds = createStore<Set<ID>>(
  initialSelectedWalletIds === null ? new Set() : new Set(initialSelectedWalletIds),
);

// Track whether user has ever saved settings (to distinguish "never set" from "deliberately empty")
const $hasUserSavedSettings = createStore(initialSelectedWalletIds !== null);

// Internal wallets store - populated from higher layer (feature/bootstrap)
const $wallets = createStore<Wallet[]>([]);
// Track known wallet IDs separately for detecting new wallets
// This is updated AFTER auto-enable logic processes, so we can detect new wallets
const $knownWalletIds = createStore<Set<ID>>(new Set());
const walletsUpdated = createEvent<Wallet[]>();

sample({
  clock: walletsUpdated,
  target: $wallets,
});

// Derived: pre-computed Set of account IDs from selected wallets for O(1) filtering
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

// Event type matchers for settings-based filtering
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

// Derived: pre-computed array of matcher functions from enabled events
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

// ==================== Events ====================

const notificationsAdded = createEvent<CreateNotificationParams[]>();
const notificationsFiltered = createEvent<CreateNotificationParams[]>();
const notificationsViewed = createEvent();
const notificationEdited = createEvent<Notification>();

// Settings events
const settingsSaved = createEvent<{ selectedWalletIds: ID[]; notificationEvents: NotificationEvent[] }>();

// ==================== Effects ====================

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

// ==================== Settings Logic ====================

// Initialize with all wallets if no saved selection (first time user)
sample({
  clock: walletsUpdated,
  source: { selectedIds: $selectedWalletIds, hasUserSaved: $hasUserSavedSettings },
  filter: ({ selectedIds, hasUserSaved }, wallets) => !hasUserSaved && selectedIds.size === 0 && wallets.length > 0,
  fn: (_, wallets) => new Set(wallets.map((w) => w.id)),
  target: $selectedWalletIds,
});

// Auto-enable new wallets that weren't deliberately disabled
// New wallet = exists in incoming but wasn't known before (not in $knownWalletIds)
sample({
  clock: walletsUpdated,
  source: { selectedIds: $selectedWalletIds, knownWalletIds: $knownWalletIds, hasUserSaved: $hasUserSavedSettings },
  filter: ({ hasUserSaved }, incomingWallets) => hasUserSaved && incomingWallets.length > 0,
  fn: ({ selectedIds, knownWalletIds }, incomingWallets) => {
    const newWalletIds = incomingWallets
      .filter((w) => !knownWalletIds.has(w.id))
      .map((w) => w.id);

    if (newWalletIds.length === 0) return selectedIds;

    const updated = new Set(selectedIds);
    for (const id of newWalletIds) {
      updated.add(id);
    }

    return updated;
  },
  target: $selectedWalletIds,
});

// Update known wallet IDs after processing (must be after auto-enable logic)
sample({
  clock: walletsUpdated,
  fn: (wallets) => new Set(wallets.map((w) => w.id)),
  target: $knownWalletIds,
});

// Update stores when settings are saved
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

// Mark that user has saved settings (for auto-enable new wallets logic)
sample({
  clock: settingsSaved,
  fn: () => true,
  target: $hasUserSavedSettings,
});

// Persist to localStorage when settings are saved
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
  clock: populateNotificationsFx.doneData,
  target: $notifications,
});

// Filter out duplicates and apply settings-based filtering
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
    const filteredOut: string[] = [];

    const newNotifications: CreateNotificationParams[] = [];

    for (const notification of incomingNotifications) {
      if (existingKeys.has(notification.key)) {
        duplicates.push(`${notification.type} (key: ${notification.key})`);
        continue;
      }

      // Apply settings-based filters
      if (enabledAccountIds.size === 0 || !enabledAccountIds.has(notification.issuer)) {
        filteredOut.push(`${notification.type} (wallet filter)`);
        continue;
      }

      if (!enabledEventMatchers.some((matcher) => matcher(notification))) {
        filteredOut.push(`${notification.type} (event filter)`);
        continue;
      }

      newNotifications.push(notification);
    }

    if (duplicates.length > 0) {
      console.warn(
        `[Notifications] Attempted to add ${duplicates.length} duplicate notification(s):`,
        duplicates.join(', '),
      );
    }

    if (filteredOut.length > 0) {
      console.info(
        `[Notifications] Filtered out ${filteredOut.length} notification(s) by settings:`,
        filteredOut.join(', '),
      );
    }

    return newNotifications;
  },
  target: notificationsFiltered,
});

// Only call effect if there are notifications to add
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

  // Settings state (for UI)
  $notificationEvents,
  $selectedWalletIds,

  events: {
    notificationsStarted: populateNotificationsFx,
    notificationsAdded,
    notificationsViewed,
    notificationEdited,
    notificationsSaved: addNotificationsFx.doneData,
    settingsSaved,
    walletsUpdated,
  },
};
