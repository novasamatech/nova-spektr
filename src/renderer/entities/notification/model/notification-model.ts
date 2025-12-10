import { createEffect, createEvent, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type CreateNotificationParams, type NoID, type Notification } from '@/shared/core';
import { merge } from '@/shared/lib/utils';

const $notifications = createStore<Notification[]>([]);
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));
const $hasUnread = $unreadCount.map((count) => count > 0);

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

const notificationsAdded = createEvent<CreateNotificationParams[]>();
const notificationsViewed = createEvent();
const notificationEdited = createEvent<Notification>();

sample({
  clock: populateNotificationsFx.doneData,
  target: $notifications,
});

// Filter out duplicates and add notifications
sample({
  clock: notificationsAdded,
  source: $notifications,
  filter: (existingNotifications, incomingNotifications) => {
    const existingKeys = new Set(existingNotifications.map((n) => n.key));

    return incomingNotifications.some((n) => !existingKeys.has(n.key));
  },
  fn: (existingNotifications, incomingNotifications) => {
    const existingKeys = new Set(existingNotifications.map((n) => n.key));
    const duplicates: string[] = [];

    const newNotifications: CreateNotificationParams[] = [];

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
    notificationsViewed,
    notificationEdited,
  },
};
