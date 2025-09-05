import { createEffect, createEvent, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type NoID, type Notification } from '@/shared/core';

const $notifications = createStore<Notification[]>([]);
const $hasUnread = $notifications.map((notifications) => notifications.some((n) => !n.read));
const $unreadCount = $notifications.map((notifications) => notifications.reduce((acc, n) => acc + (n.read ? 0 : 1), 0));

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect((notifications: NoID<Notification>[]): Promise<Notification[] | undefined> => {
  return storageService.notifications.createAll(notifications);
});

const markAllAsReadFx = createEffect((ids: Notification['id'][]): Promise<number[] | undefined> => {
  const updates = ids.map((id) => ({ id, read: true }));

  return storageService.notifications.updateAll(updates as unknown as { id: number }[]);
});

const notificationsViewed = createEvent();

sample({
  clock: populateNotificationsFx.doneData,
  target: $notifications,
});

sample({
  clock: addNotificationsFx.doneData,
  source: $notifications,
  filter: (_, notification) => Boolean(notification),
  fn: (notifications, notification) => notifications.concat(notification!),
  target: $notifications,
});

sample({
  clock: notificationsViewed,
  source: $notifications,
  filter: (ids) => ids.length > 0,
  fn: (notifications) => notifications.filter((n) => !n.read).map((n) => n.id),
  target: markAllAsReadFx,
});

sample({
  clock: markAllAsReadFx.doneData,
  source: $notifications,
  filter: (_, ids) => Boolean(ids),
  fn: (notifications) => notifications.map((n) => ({ ...n, read: true })),
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
