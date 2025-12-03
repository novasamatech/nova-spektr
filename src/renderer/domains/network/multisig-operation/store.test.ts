import { allSettled, fork } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type MultisigOperationNotification, NotificationType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { notificationModel } from '@/entities/notification';

import { multisigOperation } from './store';
import { type MultisigOperation } from './types';

const createMockOperation = (overrides: Partial<MultisigOperation> = {}): MultisigOperation => ({
  id: 'operation-1',
  status: 'pending',
  transaction: null,
  method: 'transfer',
  section: 'balances',
  callHash: '0xabcd' as any,
  callData: '0x1234' as any,
  chainId: '0x123' as any,
  accountId: toAccountId('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'),
  depositor: toAccountId('5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'),
  blockCreated: 100 as any,
  indexCreated: 1,
  events: [],
  timestamp: Date.now(),
  ...overrides,
});

describe('domains/network/multisig-operation/store - notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create notification when new operation is added', async () => {
    const mockOperation = createMockOperation();
    const mockNotifications: MultisigOperationNotification[] = [];

    jest.spyOn(storageService.multisigOperations, 'createAll').mockResolvedValue([mockOperation as any]);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications: any[]) => {
        mockNotifications.push(...notifications);
        return notifications;
      });

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.addOperations, { scope, params: [mockOperation] });

    expect(spyCreateNotifications).toHaveBeenCalled();
    expect(mockNotifications).toHaveLength(1);
    expect(mockNotifications[0]).toMatchObject({
      type: NotificationType.MULTISIG_OPERATION,
      read: false,
      multisigAccountId: mockOperation.accountId,
      callHash: mockOperation.callHash,
      callTimepoint: {
        height: mockOperation.blockCreated,
        index: mockOperation.indexCreated,
      },
      chainId: mockOperation.chainId,
      operationId: mockOperation.id,
      status: 'info',
    });
  });

  test('should create notification when operation status changes from pending to executed', async () => {
    const initialOperation = createMockOperation({ status: 'pending' });
    const updatedOperation = createMockOperation({ status: 'executed' });
    const mockNotifications: MultisigOperationNotification[] = [];

    jest.spyOn(storageService.multisigOperations, 'updateAll').mockResolvedValue(undefined);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications: any[]) => {
        mockNotifications.push(...notifications);
        return notifications;
      });

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [initialOperation])
        .set(multisigOperation.__test.$previousList, [initialOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.updateOperations, { scope, params: [updatedOperation] });

    expect(spyCreateNotifications).toHaveBeenCalled();
    expect(mockNotifications).toHaveLength(1);
    expect(mockNotifications[0]).toMatchObject({
      type: NotificationType.MULTISIG_OPERATION,
      status: 'success',
      operationId: updatedOperation.id,
    });
  });

  test('should create notification when operation status changes from pending to cancelled', async () => {
    const initialOperation = createMockOperation({ status: 'pending' });
    const updatedOperation = createMockOperation({ status: 'cancelled' });
    const mockNotifications: MultisigOperationNotification[] = [];

    jest.spyOn(storageService.multisigOperations, 'updateAll').mockResolvedValue(undefined);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications: any[]) => {
        mockNotifications.push(...notifications);
        return notifications;
      });

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [initialOperation])
        .set(multisigOperation.__test.$previousList, [initialOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.updateOperations, { scope, params: [updatedOperation] });

    expect(spyCreateNotifications).toHaveBeenCalled();
    expect(mockNotifications).toHaveLength(1);
    expect(mockNotifications[0]).toMatchObject({
      type: NotificationType.MULTISIG_OPERATION,
      status: 'error',
      operationId: updatedOperation.id,
    });
  });

  test('should create notification when operation status changes from pending to error', async () => {
    const initialOperation = createMockOperation({ status: 'pending' });
    const updatedOperation = createMockOperation({ status: 'error' });
    const mockNotifications: MultisigOperationNotification[] = [];

    jest.spyOn(storageService.multisigOperations, 'updateAll').mockResolvedValue(undefined);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications: any[]) => {
        mockNotifications.push(...notifications);
        return notifications;
      });

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [initialOperation])
        .set(multisigOperation.__test.$previousList, [initialOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.updateOperations, { scope, params: [updatedOperation] });

    expect(spyCreateNotifications).toHaveBeenCalled();
    expect(mockNotifications).toHaveLength(1);
    expect(mockNotifications[0]).toMatchObject({
      type: NotificationType.MULTISIG_OPERATION,
      status: 'error',
      operationId: updatedOperation.id,
    });
  });

  test('should NOT create notification when operation status remains the same', async () => {
    const initialOperation = createMockOperation({ status: 'pending' });
    const updatedOperation = createMockOperation({ status: 'pending' });

    jest.spyOn(storageService.multisigOperations, 'updateAll').mockResolvedValue(undefined);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest.spyOn(storageService.notifications, 'createAll');

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [initialOperation])
        .set(multisigOperation.__test.$previousList, [initialOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.updateOperations, { scope, params: [updatedOperation] });

    expect(spyCreateNotifications).not.toHaveBeenCalled();
  });

  test('should NOT create notification when operation status changes TO pending', async () => {
    const initialOperation = createMockOperation({ status: 'executed' });
    const updatedOperation = createMockOperation({ status: 'pending' });

    jest.spyOn(storageService.multisigOperations, 'updateAll').mockResolvedValue(undefined);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest.spyOn(storageService.notifications, 'createAll');

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [initialOperation])
        .set(multisigOperation.__test.$previousList, [initialOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.updateOperations, { scope, params: [updatedOperation] });

    expect(spyCreateNotifications).not.toHaveBeenCalled();
  });

  test('should create multiple notifications for multiple new operations', async () => {
    const mockOperation1 = createMockOperation({ id: 'op-1' });
    const mockOperation2 = createMockOperation({ id: 'op-2' });
    const mockNotifications: MultisigOperationNotification[] = [];

    jest
      .spyOn(storageService.multisigOperations, 'createAll')
      .mockResolvedValue([mockOperation1, mockOperation2] as any);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications: any[]) => {
        mockNotifications.push(...notifications);
        return notifications;
      });

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    await allSettled(multisigOperation.addOperations, { scope, params: [mockOperation1, mockOperation2] });

    expect(spyCreateNotifications).toHaveBeenCalled();
    expect(mockNotifications).toHaveLength(2);
    expect(mockNotifications[0]?.operationId).toBe('op-1');
    expect(mockNotifications[1]?.operationId).toBe('op-2');
  });

  test('should create mixed notifications for new and updated operations', async () => {
    const existingOperation = createMockOperation({ id: 'existing-op', status: 'pending' });
    const newOperation = createMockOperation({ id: 'new-op', status: 'pending' });
    const updatedExistingOperation = createMockOperation({ id: 'existing-op', status: 'executed' });
    const mockNotifications: MultisigOperationNotification[] = [];

    jest.spyOn(storageService.multisigOperations, 'createAll').mockResolvedValue([newOperation] as any);
    jest.spyOn(storageService.multisigOperations, 'updateAll').mockResolvedValue(undefined);
    jest.spyOn(storageService.multisigOperations, 'deleteAll').mockResolvedValue([]);
    jest.spyOn(storageService.multisigOperations, 'insertAll').mockResolvedValue(undefined);
    const spyCreateNotifications = jest
      .spyOn(storageService.notifications, 'createAll')
      .mockImplementation(async (notifications: any[]) => {
        mockNotifications.push(...notifications);
        return notifications;
      });

    const scope = fork({
      values: new Map()
        .set(multisigOperation.__test.$list, [existingOperation])
        .set(multisigOperation.__test.$previousList, [existingOperation])
        .set(multisigOperation.__test.$populated, true)
        .set(notificationModel.$notifications, []),
    });

    // Add new operation
    await allSettled(multisigOperation.addOperations, { scope, params: [newOperation] });
    // Update existing operation
    await allSettled(multisigOperation.updateOperations, { scope, params: [updatedExistingOperation] });

    expect(spyCreateNotifications).toHaveBeenCalledTimes(2);
    expect(mockNotifications).toHaveLength(2);

    // First notification should be for the new operation with 'created' status
    expect(mockNotifications[0]).toMatchObject({
      operationId: 'new-op',
      status: 'info',
    });

    // Second notification should be for the updated operation with 'executed' status
    expect(mockNotifications[1]).toMatchObject({
      operationId: 'existing-op',
      status: 'success',
    });
  });
});
