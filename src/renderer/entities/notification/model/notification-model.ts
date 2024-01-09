import { createStore, createEvent, sample, createEffect } from 'effector';

import { storageService } from '@shared/api/storage';
import { NoID, Notification } from '@shared/core';

const notificationsStarted = createEvent();
const notificationsAdded = createEvent<NoID<Notification>[]>();

const $notifications = createStore<Notification[]>([]);

const populateNotificationsFx = createEffect((): Promise<Notification[]> => {
  return storageService.notifications.readAll();
});

const addNotificationsFx = createEffect((notifications: NoID<Notification>[]): Promise<Notification[] | undefined> => {
  return storageService.notifications.createAll(notifications);
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
  clock: notificationsAdded,
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
    notificationsAdded,
  },
};
// async function insertInTable(table, collection) {
//   const dbPromise = window.indexedDB.open('spektr');
//
//   // for some reason .then() does not working
//   while (dbPromise.readyState == 'pending') {
//     await new Promise((resolve) => {
//       setTimeout(resolve, 1_000);
//     });
//     console.log('waiting');
//   }
//   const tx = dbPromise.result.transaction(table, 'readwrite');
//   console.log(tx);
//   const store = tx.objectStore(table);
//   let index = 6000;
//   collection.forEach((item) => {
//     index += 1;
//     store.put(item);
//   });
// }
// //   {
// //   chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
// //   dateCreated: Date.now(),
// //   proxiedAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
// //   proxyAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
// //   proxyType: 'Any',
// //   read: false,
// //   type: 'ProxyCreatedNotification',
// // },
// var notifs = [
//   {
//     dateCreated: Date.now(),
//     multisigAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
//     multisigAccountName: 'My MST',
//     originatorAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
//     read: false,
//     signatories: [],
//     smpRoomId: '0x123',
//     threshold: 2,
//     type: 'MultisigAccountInvitedNotification',
//   }]
//
// insertInTable('notifications', notifs);
