import { createEffect, createEvent, createStore, sample } from 'effector';
import { delay } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type NoID, type Notification, NotificationType } from '@/shared/core';
import { merge } from '@/shared/lib/utils';

const BATCH_DELAY = 1000;

export type NotificationToast = Pick<Notification, 'type' | 'status' | 'title' | 'description' | 'deepLink'> & {
  titleParams?: { count?: number };
};

const getBatchedTitle = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.MULTISIG_OPERATION:
      return 'notifications.toast.multisigOperationsAdded';
    case NotificationType.MULTISIG_CREATED:
      return 'notifications.toast.multisigWalletsCreated';
    case NotificationType.FLEXIBLE_MULTISIG_CREATED:
      return 'notifications.toast.flexibleMultisigWalletsCreated';
    case NotificationType.PROXY_CREATED:
      return 'notifications.toast.proxiesCreated';
    case NotificationType.PROXY_REMOVED:
      return 'notifications.toast.proxiesRemoved';
    default:
      return 'notifications.toast.notifications';
  }
};

const $notifications = createStore<Notification[]>([]);
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));
const $hasUnread = $unreadCount.map((count) => count > 0);

const $batchQueue = createStore<Notification[]>([]);

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect(async (notifications: NoID<Notification>[]): Promise<Notification[]> => {
  return storageService.notifications.createAll(notifications).then((r) => r ?? []);
});

const notificationsAdded = createEvent<NoID<Notification>[]>();
const notificationsAddedComplete = createEvent<Notification[]>();
const batchedNotificationsReady = createEvent<NotificationToast[]>();

// Filter out duplicates and add IDs
sample({
  clock: notificationsAdded,
  source: $notifications,
  fn: (existingNotifications, incomingNotifications) => {
    const existingKeys = new Set(existingNotifications.map((n) => n.key));
    const duplicates: string[] = [];

    const newNotifications: NoID<Notification>[] = [];

    for (const notification of incomingNotifications) {
      if (existingKeys.has(notification.key)) {
        duplicates.push(`${notification.type} (key: ${notification.key})`);
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

    return newNotifications;
  },
  target: addNotificationsFx,
});

sample({
  clock: addNotificationsFx.doneData,
  target: notificationsAddedComplete,
});

// Add to batch queue
sample({
  clock: addNotificationsFx.doneData,
  source: $batchQueue,
  fn: (queue, newNotifications) => [...queue, ...newNotifications],
  target: $batchQueue,
});

// Delayed batch processing
const processBatchTrigger = delay({
  source: addNotificationsFx.doneData,
  timeout: BATCH_DELAY,
});

sample({
  clock: processBatchTrigger,
  source: $batchQueue,
  filter: (queue) => queue.length > 0,
  fn: (queue) => {
    const groups = new Map<NotificationType, Notification[]>();

    for (const notification of queue) {
      const existing = groups.get(notification.type) || [];
      existing.push(notification);
      groups.set(notification.type, existing);
    }

    const batched: NotificationToast[] = [];
    for (const notifications of groups.values()) {
      const first = notifications[0];
      if (!first) continue;

      const isWalletNotification =
        first.type === NotificationType.MULTISIG_CREATED ||
        first.type === NotificationType.FLEXIBLE_MULTISIG_CREATED ||
        first.type === NotificationType.PROXY_CREATED ||
        first.type === NotificationType.PROXY_REMOVED;

      batched.push({
        type: first.type,
        status: first.status,
        title: notifications.length > 1 ? getBatchedTitle(first.type) : first.title,
        titleParams: notifications.length > 1 ? { count: notifications.length } : undefined,
        deepLink: first.deepLink,
        description:
          isWalletNotification && notifications.length > 1 ? 'Open wallet selector to see the full list' : undefined,
      });
    }

    return batched;
  },
  target: batchedNotificationsReady,
});

sample({
  clock: batchedNotificationsReady,
  fn: () => [],
  target: $batchQueue,
});

const markAllAsReadFx = createEffect((notifications: Notification[]): Promise<Notification[]> => {
  const updates = notifications.map((n) => ({ ...n, read: true }));

  return storageService.notifications.updateAll(updates).then(() => updates);
});

const editNotificationFx = createEffect((notification: Notification): Promise<Notification> => {
  return storageService.notifications.update(notification.id, notification).then(() => notification);
});

const notificationsViewed = createEvent();
const notificationEdited = createEvent<Notification>();

sample({
  clock: populateNotificationsFx.doneData,
  target: $notifications,
});

sample({
  clock: addNotificationsFx.doneData,
  source: $notifications,
  fn: (notifications, notification) => notifications.concat(notification),
  target: $notifications,
});

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
  events: {
    notificationsStarted: populateNotificationsFx,
    notificationsAdded,
    notificationsAddedComplete,
    batchedNotificationsReady,
    notificationsViewed,
    notificationEdited,
  },
};
