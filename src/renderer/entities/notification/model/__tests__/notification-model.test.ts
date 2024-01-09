import { fork, allSettled } from 'effector';

import { Notification, NotificationType } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { notificationModel } from '../notification-model';

const notifications = [
  {
    id: 1,
    read: true,
    dateCreated: Date.now(),
    type: NotificationType.MULTISIG_INVITE,
  },
] as Notification[];

const newNotification = {
  id: 2,
  read: true,
  dateCreated: Date.now(),
  type: NotificationType.MULTISIG_INVITE,
} as Notification;

describe('entities/notification/model/notification-model', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should populate $notifications on notificationsStarted', async () => {
    const spyReadAll = jest.spyOn(storageService.notifications, 'readAll').mockResolvedValue(notifications);

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    await allSettled(notificationModel.events.notificationsStarted, { scope });

    expect(spyReadAll).toHaveBeenCalled();
    expect(scope.getState(notificationModel.$notifications)).toEqual(notifications);
  });

  test('should add new notification on notificationAdded', async () => {
    const spyCreate = jest.spyOn(storageService.notifications, 'create').mockResolvedValue(newNotification);

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    await allSettled(notificationModel.events.notificationAdded, { scope, params: newNotification });

    expect(spyCreate).toHaveBeenCalled();
    expect(scope.getState(notificationModel.$notifications)).toEqual([newNotification]);
  });
});
