import { allSettled, fork } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { storageService } from '@/shared/api/storage';
import {
  type CreateNotificationParams,
  type Notification,
  type Wallet,
  NotificationEvent,
  NotificationType,
  WalletType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { notificationModel } from '../notification-model';

const mockAccountId = '0x1234567890abcdef' as AccountId;
const mockAccountId2 = '0xabcdef1234567890' as AccountId;
const mockChainId = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as const;

// All events for convenience
const ALL_EVENTS = [
  NotificationEvent.WALLET_CREATED,
  NotificationEvent.OPERATION_CREATED,
  NotificationEvent.OPERATION_EXECUTED,
  NotificationEvent.OPERATION_REJECTED,
];

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

const mockWallet = {
  id: 1,
  name: 'Test Wallet',
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  signingType: 'signing',
  accounts: [{ accountId: mockAccountId }],
} as unknown as Wallet;

const mockWallet2 = {
  id: 2,
  name: 'Test Wallet 2',
  type: WalletType.POLKADOT_VAULT,
  isActive: true,
  signingType: 'signing',
  accounts: [{ accountId: mockAccountId2 }],
} as unknown as Wallet;

// Helper to create a scope with wallets and settings
const createScopeWithFilters = async (
  wallets: Wallet[],
  selectedWalletIds: number[],
  enabledEvents: NotificationEvent[],
) => {
  const scope = fork({
    values: new Map().set(notificationModel.$notifications, []),
  });

  // Provide wallets via the walletsUpdated event
  await allSettled(notificationModel.events.walletsUpdated, { scope, params: wallets });

  // Convert selected to disabled (wallets NOT in selectedWalletIds are disabled)
  const selectedSet = new Set(selectedWalletIds);
  const disabledWalletIds = wallets.filter((w) => !selectedSet.has(w.id)).map((w) => w.id);

  await allSettled(notificationModel.events.settingsSaved, {
    scope,
    params: {
      disabledWalletIds,
      notificationEvents: enabledEvents,
      soundEnabled: false,
    },
  });

  return scope;
};

describe('entities/notification/model/notification-model', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    test('should populate $notifications on notificationsStarted', async () => {
      const spyReadAll = vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue(notifications);

      const scope = fork({
        values: new Map().set(notificationModel.$notifications, []),
      });

      await allSettled(notificationModel.events.notificationsStarted, { scope });

      expect(spyReadAll).toHaveBeenCalled();
      expect(scope.getState(notificationModel.$notifications)).toEqual(notifications);
    });

    test('should update wallets store on walletsUpdated', async () => {
      const scope = fork();

      await allSettled(notificationModel.events.walletsUpdated, { scope, params: [mockWallet, mockWallet2] });

      // Wallets are stored internally - we verify by checking that filtering works
      // Disable wallet 2 (only wallet 1 should receive notifications)
      await allSettled(notificationModel.events.settingsSaved, {
        scope,
        params: { disabledWalletIds: [2], notificationEvents: ALL_EVENTS, soundEnabled: false },
      });

      // The disabled wallet IDs should now be stored
      const disabledIds = scope.getState(notificationModel.$disabledWalletIds);
      expect(disabledIds.has(2)).toBe(true);
      expect(disabledIds.has(1)).toBe(false);
    });

    test('should have new wallets enabled by default (not in disabled list)', async () => {
      const scope = fork();

      // User saves settings with wallet 2 disabled
      await allSettled(notificationModel.events.walletsUpdated, { scope, params: [mockWallet] });
      await allSettled(notificationModel.events.settingsSaved, {
        scope,
        params: { disabledWalletIds: [], notificationEvents: ALL_EVENTS, soundEnabled: false },
      });

      // Now add wallet 2 (new wallet) - it should NOT be in disabled list
      await allSettled(notificationModel.events.walletsUpdated, { scope, params: [mockWallet, mockWallet2] });

      const disabledIds = scope.getState(notificationModel.$disabledWalletIds);

      // New wallet 2 should not be disabled (enabled by default)
      expect(disabledIds.has(2)).toBe(false);
    });

    test('should keep deliberately disabled wallets disabled', async () => {
      const scope = fork();

      // Both wallets exist, user disables wallet 2
      await allSettled(notificationModel.events.walletsUpdated, { scope, params: [mockWallet, mockWallet2] });
      await allSettled(notificationModel.events.settingsSaved, {
        scope,
        params: { disabledWalletIds: [2], notificationEvents: ALL_EVENTS, soundEnabled: false },
      });

      // Same wallets update again (no new wallets)
      await allSettled(notificationModel.events.walletsUpdated, { scope, params: [mockWallet, mockWallet2] });

      const disabledIds = scope.getState(notificationModel.$disabledWalletIds);

      // Wallet 2 should remain disabled
      expect(disabledIds.has(2)).toBe(true);
    });
  });

  describe('adding notifications', () => {
    test('should add new notification on notificationsAdded', async () => {
      const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue(createdNotifications);

      const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);
      await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

      expect(spyCreate).toHaveBeenCalled();
      expect(scope.getState(notificationModel.$notifications)).toEqual(createdNotifications);
    });

    test('should filter out duplicate notifications by key', async () => {
      const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

      const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);

      // Set existing notification with same key
      await allSettled(notificationModel.$notifications, {
        scope,
        params: notifications, // has key 'test-key-1'
      });

      // Try to add notification with same key
      const duplicateNotification: CreateNotificationParams[] = [
        {
          ...newNotificationParams[0]!,
          key: 'test-key-1', // Same key as existing
        },
      ];

      await allSettled(notificationModel.events.notificationsAdded, { scope, params: duplicateNotification });

      // Should not call create since it's a duplicate
      expect(spyCreate).not.toHaveBeenCalled();
    });
  });

  describe('notification filtering', () => {
    describe('event type filtering', () => {
      test('should filter out WALLET_CREATED notifications when event is disabled', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        const walletCreatedNotification: CreateNotificationParams[] = [
          {
            key: 'wallet-created-key',
            type: NotificationType.MULTISIG_CREATED,
            status: 'info',
            issuer: mockAccountId,
            chainId: mockChainId,
            title: 'Multisig Created',
            multisigAccountId: mockAccountId,
            signatories: [mockAccountId],
            threshold: 2,
            multisigAccountName: 'New Multisig',
            batch: { title: 'Batch' },
          },
        ];

        const scope = await createScopeWithFilters(
          [mockWallet],
          [1],
          [
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: walletCreatedNotification });

        expect(spyCreate).not.toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual([]);
      });

      test('should filter out OPERATION_CREATED notifications when event is disabled', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        const operationCreatedNotification = [
          {
            key: 'operation-created-key',
            type: NotificationType.MULTISIG_OPERATION,
            status: 'info',
            issuer: mockAccountId,
            chainId: mockChainId,
            title: 'Operation Created',
            batch: { title: 'Batch' },
          } as unknown as CreateNotificationParams,
        ];

        const scope = await createScopeWithFilters(
          [mockWallet],
          [1],
          [
            NotificationEvent.WALLET_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: operationCreatedNotification });

        expect(spyCreate).not.toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual([]);
      });

      test('should filter out OPERATION_EXECUTED notifications when event is disabled', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        const operationExecutedNotification = [
          {
            key: 'operation-executed-key',
            type: NotificationType.MULTISIG_OPERATION,
            status: 'success',
            issuer: mockAccountId,
            chainId: mockChainId,
            title: 'Operation Executed',
            batch: { title: 'Batch' },
          } as unknown as CreateNotificationParams,
        ];

        const scope = await createScopeWithFilters(
          [mockWallet],
          [1],
          [NotificationEvent.WALLET_CREATED, NotificationEvent.OPERATION_CREATED, NotificationEvent.OPERATION_REJECTED],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: operationExecutedNotification });

        expect(spyCreate).not.toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual([]);
      });

      test('should filter out OPERATION_REJECTED notifications when event is disabled', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        const operationRejectedNotification = [
          {
            key: 'operation-rejected-key',
            type: NotificationType.MULTISIG_OPERATION,
            status: 'error',
            issuer: mockAccountId,
            chainId: mockChainId,
            title: 'Operation Rejected',
            batch: { title: 'Batch' },
          } as unknown as CreateNotificationParams,
        ];

        const scope = await createScopeWithFilters(
          [mockWallet],
          [1],
          [NotificationEvent.WALLET_CREATED, NotificationEvent.OPERATION_CREATED, NotificationEvent.OPERATION_EXECUTED],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: operationRejectedNotification });

        expect(spyCreate).not.toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual([]);
      });

      test('should allow notifications when all events are enabled (default)', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue(createdNotifications);

        const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(spyCreate).toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual(createdNotifications);
      });
    });

    describe('wallet filtering', () => {
      test('should filter out notifications from unselected wallets', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        const notificationFromWallet1: CreateNotificationParams[] = [
          {
            key: 'wallet1-notification',
            type: NotificationType.MULTISIG_CREATED,
            status: 'info',
            issuer: mockAccountId,
            chainId: mockChainId,
            title: 'Notification from Wallet 1',
            multisigAccountId: mockAccountId,
            signatories: [mockAccountId],
            threshold: 2,
            multisigAccountName: 'Multisig',
            batch: { title: 'Batch' },
          },
        ];

        // Only wallet 2 selected
        const scope = await createScopeWithFilters([mockWallet, mockWallet2], [2], ALL_EVENTS);

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: notificationFromWallet1 });

        expect(spyCreate).not.toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual([]);
      });

      test('should allow notifications from selected wallets', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue(createdNotifications);

        const notificationFromWallet1: CreateNotificationParams[] = [
          {
            key: 'wallet1-notification',
            type: NotificationType.MULTISIG_CREATED,
            status: 'info',
            issuer: mockAccountId,
            chainId: mockChainId,
            title: 'Notification from Wallet 1',
            multisigAccountId: mockAccountId,
            signatories: [mockAccountId],
            threshold: 2,
            multisigAccountName: 'Multisig',
            batch: { title: 'Batch' },
          },
        ];

        // Both wallets selected
        const scope = await createScopeWithFilters([mockWallet, mockWallet2], [1, 2], ALL_EVENTS);

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: notificationFromWallet1 });

        expect(spyCreate).toHaveBeenCalled();
      });

      test('should filter out all notifications when no wallets are selected', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        // No wallets selected
        const scope = await createScopeWithFilters([mockWallet], [], ALL_EVENTS);

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(spyCreate).not.toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual([]);
      });

      test('should allow notifications when all wallets are selected (default behavior)', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue(createdNotifications);

        // Both wallets selected
        const scope = await createScopeWithFilters([mockWallet, mockWallet2], [1, 2], ALL_EVENTS);

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(spyCreate).toHaveBeenCalled();
        expect(scope.getState(notificationModel.$notifications)).toEqual(createdNotifications);
      });
    });

    describe('combined filtering', () => {
      test('should filter notification when both event and wallet filters fail', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        // Only wallet 2 selected AND wallet_created disabled
        const scope = await createScopeWithFilters(
          [mockWallet, mockWallet2],
          [2],
          [
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(spyCreate).not.toHaveBeenCalled();
      });

      test('should filter notification when wallet filter passes but event filter fails', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        // Wallet 1 selected but event disabled
        const scope = await createScopeWithFilters(
          [mockWallet],
          [1],
          [
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(spyCreate).not.toHaveBeenCalled();
      });

      test('should filter notification when event filter passes but wallet filter fails', async () => {
        const spyCreate = vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        // Event enabled but wallet 1 not selected
        const scope = await createScopeWithFilters([mockWallet, mockWallet2], [2], ALL_EVENTS);

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(spyCreate).not.toHaveBeenCalled();
      });
    });

    describe('toast filtering', () => {
      test('should not show toast for filtered notifications', async () => {
        vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);

        // Wallet 1 selected but wallet_created disabled
        const scope = await createScopeWithFilters(
          [mockWallet],
          [1],
          [
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
        );

        await allSettled(notificationModel.events.notificationsAdded, { scope, params: newNotificationParams });

        expect(scope.getState(notificationModel.$toasts)).toEqual([]);
      });
    });
  });

  describe('derived stores', () => {
    test('$unreadCount should count unread notifications', () => {
      const unreadNotifications = [
        { ...notifications[0], id: 1, read: false },
        { ...notifications[0], id: 2, read: true },
        { ...notifications[0], id: 3, read: false },
      ] as Notification[];

      const scope = fork({
        values: new Map().set(notificationModel.$notifications, unreadNotifications),
      });

      expect(scope.getState(notificationModel.$unreadCount)).toBe(2);
    });

    test('$hasUnread should be true when there are unread notifications', () => {
      const unreadNotifications = [{ ...notifications[0], read: false }] as Notification[];

      const scope = fork({
        values: new Map().set(notificationModel.$notifications, unreadNotifications),
      });

      expect(scope.getState(notificationModel.$hasUnread)).toBe(true);
    });

    test('$hasUnread should be false when all notifications are read', () => {
      const readNotifications = [{ ...notifications[0], read: true }] as Notification[];

      const scope = fork({
        values: new Map().set(notificationModel.$notifications, readNotifications),
      });

      expect(scope.getState(notificationModel.$hasUnread)).toBe(false);
    });
  });

  describe('mark as read', () => {
    test('should mark all notifications as read on notificationsViewed', async () => {
      const unreadNotifications = [
        { ...notifications[0], id: 1, read: false },
        { ...notifications[0], id: 2, read: false },
      ] as Notification[];

      vi.spyOn(storageService.notifications, 'updateAll').mockResolvedValue(undefined);

      const scope = fork({
        values: new Map().set(notificationModel.$notifications, unreadNotifications),
      });

      await allSettled(notificationModel.events.notificationsViewed, { scope });

      const result = scope.getState(notificationModel.$notifications);
      expect(result.every((n) => n.read)).toBe(true);
    });
  });

  describe('edit notification', () => {
    test('should update notification on notificationEdited', async () => {
      const editedNotification = { ...notifications[0], title: 'Updated title' } as Notification;

      vi.spyOn(storageService.notifications, 'update').mockResolvedValue(undefined);

      const scope = fork({
        values: new Map().set(notificationModel.$notifications, notifications),
      });

      await allSettled(notificationModel.events.notificationEdited, { scope, params: editedNotification });

      const result = scope.getState(notificationModel.$notifications);
      expect(result[0]!.title).toBe('Updated title');
    });
  });

  describe('toast batching by status', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const makeOperationNotification = (
      key: string,
      status: 'info' | 'success' | 'error',
      batchTitle: string,
    ): CreateNotificationParams => ({
      key,
      type: NotificationType.MULTISIG_OPERATION,
      status,
      issuer: mockAccountId,
      chainId: mockChainId,
      title: `Operation ${key}`,
      multisigAccountId: mockAccountId,
      callHash: '0x00' as `0x${string}`,
      callTimepoint: { height: 1, index: 0 },
      batch: {
        title: batchTitle,
        link: { title: 'View', path: '/operations' },
      },
    });

    const makeEventNotification = (
      key: string,
      status: 'success' | 'error',
      batchTitle: string,
    ): CreateNotificationParams => ({
      key,
      type: NotificationType.MULTISIG_EVENT,
      status,
      issuer: mockAccountId,
      chainId: mockChainId,
      title: `Event ${key}`,
      multisigAccountId: mockAccountId,
      callHash: '0x00' as `0x${string}`,
      callTimepoint: { height: 1, index: 0 },
      signerAccountId: mockAccountId2,
      eventStatus: status === 'success' ? 'approve' : 'reject',
      batch: {
        title: batchTitle,
        link: { title: 'View', path: '/operations' },
      },
    });

    test('should group notifications by batch title into separate toasts', async () => {
      vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
      vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);

      const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);

      const mixedNotifications: CreateNotificationParams[] = [
        makeOperationNotification('op-1', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-2', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-3', 'error', 'notifications.toast.batch.multisigOperationsRejected'),
        makeOperationNotification('op-4', 'error', 'notifications.toast.batch.multisigOperationsRejected'),
        makeOperationNotification('op-5', 'error', 'notifications.toast.batch.multisigOperationsRejected'),
        makeOperationNotification('op-6', 'success', 'notifications.toast.batch.multisigOperationsApproved'),
      ];

      const promise = allSettled(notificationModel.events.notificationsAdded, {
        scope,
        params: mixedNotifications,
      });
      vi.advanceTimersByTime(1000);
      await promise;

      const toasts = scope.getState(notificationModel.$toasts);

      expect(toasts).toHaveLength(3);

      const addedToast = toasts.find((t) => t.title === 'notifications.toast.batch.multisigOperationsAdded');
      const rejectedToast = toasts.find((t) => t.title === 'notifications.toast.batch.multisigOperationsRejected');
      // Single notification keeps its original title, not the batch title
      const approvedToast = toasts.find((t) => t.title === 'Operation op-6');

      expect(addedToast).toEqual({
        title: 'notifications.toast.batch.multisigOperationsAdded',
        status: 'info',
        link: { title: 'View', path: '/operations' },
        count: 2,
      });

      expect(rejectedToast).toEqual({
        title: 'notifications.toast.batch.multisigOperationsRejected',
        status: 'error',
        link: { title: 'View', path: '/operations' },
        count: 3,
      });

      expect(approvedToast).toMatchObject({
        title: 'Operation op-6',
        status: 'success',
      });
      expect(approvedToast?.count).toBeUndefined();
    });

    test('should show single notification as-is without batching', async () => {
      vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
      vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);

      const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);

      const singleNotification: CreateNotificationParams[] = [
        makeOperationNotification('op-1', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
      ];

      const promise = allSettled(notificationModel.events.notificationsAdded, {
        scope,
        params: singleNotification,
      });
      vi.advanceTimersByTime(1000);
      await promise;

      const toasts = scope.getState(notificationModel.$toasts);

      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({
        title: 'Operation op-1',
        status: 'info',
      });
      expect(toasts[0].count).toBeUndefined();
    });

    test('should keep different notification types in separate groups even with the same batch title', async () => {
      vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
      vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);

      const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);

      const notifications: CreateNotificationParams[] = [
        makeOperationNotification('op-1', 'success', 'notifications.toast.batch.multisigOperationsApproved'),
        makeEventNotification('ev-1', 'success', 'notifications.toast.batch.multisigOperationsApproved'),
      ];

      const promise = allSettled(notificationModel.events.notificationsAdded, {
        scope,
        params: notifications,
      });
      vi.advanceTimersByTime(1000);
      await promise;

      const toasts = scope.getState(notificationModel.$toasts);

      // Each type is a separate toast since grouping key includes notification type
      expect(toasts).toHaveLength(2);
      expect(toasts[0]).toMatchObject({ title: 'Operation op-1', status: 'success' });
      expect(toasts[1]).toMatchObject({ title: 'Event ev-1', status: 'success' });
    });

    test('should produce correct counts matching number of notifications per status', async () => {
      vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
      vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);

      const scope = await createScopeWithFilters([mockWallet], [1], ALL_EVENTS);

      const notifications: CreateNotificationParams[] = [
        makeOperationNotification('op-1', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-2', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-3', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-4', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-5', 'info', 'notifications.toast.batch.multisigOperationsAdded'),
        makeOperationNotification('op-6', 'error', 'notifications.toast.batch.multisigOperationsRejected'),
        makeOperationNotification('op-7', 'error', 'notifications.toast.batch.multisigOperationsRejected'),
        makeOperationNotification('op-8', 'error', 'notifications.toast.batch.multisigOperationsRejected'),
      ];

      const promise = allSettled(notificationModel.events.notificationsAdded, {
        scope,
        params: notifications,
      });
      vi.advanceTimersByTime(1000);
      await promise;

      const toasts = scope.getState(notificationModel.$toasts);

      expect(toasts).toHaveLength(2);

      const addedToast = toasts.find((t) => t.title === 'notifications.toast.batch.multisigOperationsAdded');
      const rejectedToast = toasts.find((t) => t.title === 'notifications.toast.batch.multisigOperationsRejected');

      expect(addedToast?.count).toBe(5);
      expect(rejectedToast?.count).toBe(3);
    });
  });

  describe('sound settings', () => {
    const SOUND_ENABLED_KEY = 'notification_sound_enabled';

    test('should have sound disabled by default', () => {
      const scope = fork();
      expect(scope.getState(notificationModel.$soundEnabled)).toBe(false);
    });

    test('should update $soundEnabled when settingsSaved is called', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork();

      await allSettled(notificationModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: ALL_EVENTS,
          soundEnabled: true,
        },
      });

      expect(scope.getState(notificationModel.$soundEnabled)).toBe(true);
    });

    test('should persist sound setting to localStorage when settingsSaved is called', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork();

      await allSettled(notificationModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: ALL_EVENTS,
          soundEnabled: true,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(SOUND_ENABLED_KEY, true);
    });

    test('should allow toggling sound setting off', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map().set(notificationModel.$soundEnabled, true),
      });

      await allSettled(notificationModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: ALL_EVENTS,
          soundEnabled: false,
        },
      });

      expect(scope.getState(notificationModel.$soundEnabled)).toBe(false);
    });
  });
});
