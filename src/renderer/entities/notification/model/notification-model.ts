import { createStore, createEvent, sample, createEffect } from 'effector';

import { storageService } from '@shared/api/storage';
import type { NoID, Notification } from '@shared/core';

const notificationsStarted = createEvent();
const notificationAdded = createEvent<NoID<Notification>>();

const $notifications = createStore<Notification[]>([]);

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect((notification: NoID<Notification>): Promise<Notification | undefined> => {
  return storageService.notifications.create(notification);
});

sample({
  clock: notificationsStarted,
  target: populateNotificationsFx,
});

sample({
  clock: populateNotificationsFx.doneData,
  target: $notifications,
});

sample({
  clock: notificationAdded,
  target: addNotificationsFx,
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
    notificationsStarted,
    notificationAdded,
  },
};
