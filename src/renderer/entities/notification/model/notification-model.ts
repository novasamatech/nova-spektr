import { createEffect, createEvent, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type NoID, type Notification } from '@/shared/core';
import { merge } from '@/shared/lib/utils';

const $notifications = createStore<Notification[]>([]);
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));
const $hasUnread = $unreadCount.map((count) => count > 0);

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect((notifications: NoID<Notification>[]): Promise<Notification[]> => {
  return storageService.notifications.createAll(notifications).then((r) => r ?? []);
});

const markAllAsReadFx = createEffect((notifications: Notification[]): Promise<Notification[]> => {
  const updates = notifications.map((n) => ({ ...n, read: true }));

  return storageService.notifications.updateAll(updates).then(() => updates);
});

const notificationsViewed = createEvent();

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

export const notificationModel = {
  $notifications,
  $hasUnread,
  $unreadCount,
  events: {
    notificationsStarted: populateNotificationsFx,
    notificationsAdded: addNotificationsFx,
    notificationsViewed,
  },
};
