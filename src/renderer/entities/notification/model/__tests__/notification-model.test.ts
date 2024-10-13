import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Notification, NotificationType } from '@/shared/core';
import { notificationModel } from '../notification-model';

const notifications = [
  {
    id: 1,
    read: true,
    dateCreated: Date.now(),
    type: NotificationType.MULTISIG_CREATED,
  },
] as Notification[];

const newNotifications = [
  {
    id: 2,
    read: true,
    dateCreated: Date.now(),
    type: NotificationType.MULTISIG_CREATED,
  },
] as Notification[];

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

  test('should add new notification on notificationsAdded', async () => {
    const spyCreate = jest.spyOn(storageService.notifications, 'createAll').mockResolvedValue(newNotifications);

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotifications });

    expect(spyCreate).toHaveBeenCalled();
    expect(scope.getState(notificationModel.$notifications)).toEqual(newNotifications);
  });
});
