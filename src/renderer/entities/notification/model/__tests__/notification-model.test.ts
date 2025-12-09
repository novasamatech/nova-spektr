import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type ChainId, type HexString, type Notification, NotificationType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { notificationModel } from '../notification-model';

const notifications = [
  {
    id: 1,
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
    const notificationWithKey = {
      key: `${NotificationType.MULTISIG_CREATED}:test-account-id`,
      read: true,
      dateCreated: Date.now(),
      type: NotificationType.MULTISIG_CREATED,
      status: 'info' as const,
      issuer: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      title: 'Multisig wallet added',
      chainId: '0x123' as ChainId,
      multisigAccountId: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      signatories: [],
      threshold: 2,
      multisigAccountName: 'Test',
    };

    jest.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);
    const spyCreate = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications) => {
        return notifications.map((n, index) => ({ ...n, id: index + 1 })) as Notification[];
      });

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    await allSettled(notificationModel.events.notificationsAdded, { scope, params: [notificationWithKey] });

    expect(spyCreate).toHaveBeenCalled();
    const createdNotifications = scope.getState(notificationModel.$notifications);
    expect(createdNotifications).toHaveLength(1);
    expect(createdNotifications[0]).toHaveProperty('id');
  });

  test('should prevent duplicate notifications based on content', async () => {
    const operationNotification = {
      key: `${NotificationType.MULTISIG_OPERATION}:operation-1:info`,
      type: NotificationType.MULTISIG_OPERATION,
      read: false,
      dateCreated: Date.now(),
      status: 'info' as const,
      issuer: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      title: 'Multisig operation created',
      multisigAccountId: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      callHash: '0xabcd' as HexString,
      callTimepoint: { height: 100, index: 1 },
      chainId: '0x123' as ChainId,
      operationId: 'operation-1',
    };

    // First, add the notification
    jest.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);
    const firstCreateSpy = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications) => {
        return notifications.map((n, index) => ({ ...n, id: index + 1 })) as Notification[];
      });

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    await allSettled(notificationModel.events.notificationsAdded, { scope, params: [operationNotification] });
    const createdNotifications = scope.getState(notificationModel.$notifications);
    expect(createdNotifications).toHaveLength(1);

    // Now try to add the same notification again
    jest.spyOn(storageService.notifications, 'readAll').mockResolvedValue(createdNotifications);
    const secondCreateSpy = jest.spyOn(storageService.notifications, 'createAll');
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await allSettled(notificationModel.events.notificationsAdded, { scope, params: [operationNotification] });

    // Should not create duplicate
    expect(secondCreateSpy).not.toHaveBeenCalled();
    // Should log warning
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate notification'),
      expect.any(String),
    );
    // Store should remain with only one notification
    expect(scope.getState(notificationModel.$notifications)).toEqual(createdNotifications);

    firstCreateSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test('should differentiate operation notifications by status', async () => {
    const pendingNotification = {
      key: `${NotificationType.MULTISIG_OPERATION}:operation-1:info`,
      type: NotificationType.MULTISIG_OPERATION,
      read: false,
      dateCreated: Date.now(),
      status: 'info' as const,
      issuer: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      title: 'Multisig operation created',
      multisigAccountId: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      callHash: '0xabcd' as HexString,
      callTimepoint: { height: 100, index: 1 },
      chainId: '0x123' as ChainId,
      operationId: 'operation-1',
    };

    const executedNotification = {
      key: `${NotificationType.MULTISIG_OPERATION}:operation-1:success`,
      type: NotificationType.MULTISIG_OPERATION,
      read: false,
      dateCreated: Date.now(),
      status: 'success' as const,
      issuer: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      title: 'Multisig operation executed',
      multisigAccountId: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
      callHash: '0xabcd' as HexString,
      callTimepoint: { height: 100, index: 1 },
      chainId: '0x123' as ChainId,
      operationId: 'operation-1',
    };

    jest.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);
    const spyCreate = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications) => {
        return notifications.map((n, index) => ({ ...n, id: index + 1 })) as Notification[];
      });

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    // Add both notifications
    await allSettled(notificationModel.events.notificationsAdded, {
      scope,
      params: [pendingNotification, executedNotification],
    });

    // Both should be created with different IDs
    expect(spyCreate).toHaveBeenCalled();
    const createdNotifications = scope.getState(notificationModel.$notifications);
    expect(createdNotifications).toHaveLength(2);
    expect(createdNotifications[0].id).not.toBe(createdNotifications[1].id);
  });
});
