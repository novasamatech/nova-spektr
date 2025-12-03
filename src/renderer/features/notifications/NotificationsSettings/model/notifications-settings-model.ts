import { createEffect, createEvent, createStore, sample } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { NOTIFICATION_EVENTS, NOTIFICATION_SOURCE, NotificationEvent, NotificationSource } from '../lib/constants';

const notificationSourceChanged = createEvent<NotificationSource>();
const notificationEventToggled = createEvent<NotificationEvent>();

const initialNotificationSource = localStorageService.getFromStorage(NOTIFICATION_SOURCE, NotificationSource.ALL);
const initialNotificationEvents = localStorageService.getFromStorage(NOTIFICATION_EVENTS, [
  NotificationEvent.WALLET_CREATED,
  NotificationEvent.OPERATION_CREATED,
  NotificationEvent.OPERATION_EXECUTED,
  NotificationEvent.OPERATION_REJECTED,
]);

const $notificationSource = createStore<NotificationSource>(initialNotificationSource);
const $notificationEvents = createStore<Set<NotificationEvent>>(new Set(initialNotificationEvents));

const saveNotificationSourceFx = createEffect((value: NotificationSource): NotificationSource => {
  return localStorageService.saveToStorage(NOTIFICATION_SOURCE, value);
});

const saveNotificationEventsFx = createEffect((value: NotificationEvent[]): NotificationEvent[] => {
  return localStorageService.saveToStorage(NOTIFICATION_EVENTS, value);
});

sample({
  clock: notificationSourceChanged,
  target: saveNotificationSourceFx,
});

sample({
  clock: saveNotificationSourceFx.doneData,
  target: $notificationSource,
});

sample({
  clock: notificationEventToggled,
  source: $notificationEvents,
  fn: (events, event) => {
    const newEvents = new Set(events);
    if (newEvents.has(event)) {
      newEvents.delete(event);
    } else {
      newEvents.add(event);
    }
    return newEvents;
  },
  target: $notificationEvents,
});

sample({
  clock: $notificationEvents,
  fn: (events) => Array.from(events),
  target: saveNotificationEventsFx,
});

export const notificationsSettingsModel = {
  $notificationSource,
  $notificationEvents,
  events: {
    notificationSourceChanged,
    notificationEventToggled,
  },
};
