import { createEffect, createStore, sample } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type NoID, type Notification } from '@/shared/core';

const $notifications = createStore<Notification[]>([]);

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect((notifications: NoID<Notification>[]): Promise<Notification[] | undefined> => {
  return storageService.notifications.createAll(notifications);
});

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

export const notificationModel = {
  $notifications,
  events: {
    notificationsStarted: populateNotificationsFx,
    notificationsAdded: addNotificationsFx,
  },
};
