import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type CreateNotificationParams, type Notification, NotificationType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { notificationModel } from '../notification-model';

const mockAccountId = '0x1234567890abcdef' as AccountId;
const mockChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as const;

const notifications = [
  {
    id: 1,
    key: 'test-key-1',
    read: true,
    dateCreated: Date.now(),
    type: NotificationType.MULTISIG_CREATED,
    status: 'info',
    issuer: mockAccountId,
    chainId: mockChainId,
    title: 'Test notification',
    multisigAccountId: mockAccountId,
    signatories: [mockAccountId],
    threshold: 2,
    multisigAccountName: 'Test Multisig',
  },
] as Notification[];

const newNotificationParams: CreateNotificationParams[] = [
  {
    key: 'test-key-2',
    type: NotificationType.MULTISIG_CREATED,
    status: 'info',
    issuer: mockAccountId,
    chainId: mockChainId,
    title: 'New notification',
    multisigAccountId: mockAccountId,
    signatories: [mockAccountId],
    threshold: 2,
    multisigAccountName: 'New Multisig',
    batch: {
      title: 'Multisig wallets added',
    },
  },
];

const createdNotifications = [
  {
    id: 2,
    key: 'test-key-2',
    read: false,
    dateCreated: Date.now(),
    type: NotificationType.MULTISIG_CREATED,
    status: 'info',
    issuer: mockAccountId,
    chainId: mockChainId,
    title: 'New notification',
    multisigAccountId: mockAccountId,
    signatories: [mockAccountId],
    threshold: 2,
    multisigAccountName: 'New Multisig',
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
    const spyCreate = jest.spyOn(storageService.notifications, 'createAll').mockResolvedValue(createdNotifications);

    const scope = fork({
      values: new Map().set(notificationModel.$notifications, []),
    });

    await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

    expect(spyCreate).toHaveBeenCalled();
    expect(scope.getState(notificationModel.$notifications)).toEqual(createdNotifications);
  });
});
