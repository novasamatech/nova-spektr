import { allSettled, fork } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { NotificationEvent } from '@/shared/core';
import { notificationsSettingsModel } from '../notifications-settings-model';

// LocalStorage keys matching those in notification-model.ts
const NOTIFICATION_EVENTS_KEY = 'notification_events';
const SELECTED_WALLET_IDS_KEY = 'notification_selected_wallet_ids';

describe('features/notifications/NotificationsSettings/model/notifications-settings-model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('default values', () => {
    test('should have all notification events enabled by default', () => {
      const scope = fork();

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.has(NotificationEvent.WALLET_CREATED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_CREATED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_EXECUTED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_REJECTED)).toBe(true);
      expect(events.size).toBe(4);
    });

    test('should start with empty wallet selection when no wallets are loaded yet', () => {
      // When there's no saved selection (null) and no wallets loaded,
      // the store starts empty and will be populated when wallets load
      const scope = fork({
        values: new Map().set(notificationsSettingsModel.$selectedWalletIds, new Set()),
      });

      const selectedIds = scope.getState(notificationsSettingsModel.$selectedWalletIds);

      // Initially empty, will be filled when wallets load
      expect(selectedIds.size).toBe(0);
    });
  });

  describe('settings persistence', () => {
    test('should save notification events to localStorage when settingsSaved is called', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage');

      const scope = fork({
        values: new Map()
          .set(
            notificationsSettingsModel.$notificationEvents,
            new Set([
              NotificationEvent.WALLET_CREATED,
              NotificationEvent.OPERATION_CREATED,
              NotificationEvent.OPERATION_EXECUTED,
              NotificationEvent.OPERATION_REJECTED,
            ]),
          )
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1, 2])),
      });

      // Save with only some events enabled
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1, 2],
          notificationEvents: [NotificationEvent.WALLET_CREATED, NotificationEvent.OPERATION_CREATED],
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(NOTIFICATION_EVENTS_KEY, [
        NotificationEvent.WALLET_CREATED,
        NotificationEvent.OPERATION_CREATED,
      ]);
    });

    test('should save selected wallet IDs to localStorage when settingsSaved is called', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage');

      const scope = fork({
        values: new Map()
          .set(
            notificationsSettingsModel.$notificationEvents,
            new Set([
              NotificationEvent.WALLET_CREATED,
              NotificationEvent.OPERATION_CREATED,
              NotificationEvent.OPERATION_EXECUTED,
              NotificationEvent.OPERATION_REJECTED,
            ]),
          )
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1, 2])),
      });

      // Save with only one wallet selected
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1],
          notificationEvents: [
            NotificationEvent.WALLET_CREATED,
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(SELECTED_WALLET_IDS_KEY, [1]);
    });

    test('should update $notificationEvents store when settingsSaved is called', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(
            notificationsSettingsModel.$notificationEvents,
            new Set([
              NotificationEvent.WALLET_CREATED,
              NotificationEvent.OPERATION_CREATED,
              NotificationEvent.OPERATION_EXECUTED,
              NotificationEvent.OPERATION_REJECTED,
            ]),
          )
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1])),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.size).toBe(1);
      expect(events.has(NotificationEvent.WALLET_CREATED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_CREATED)).toBe(false);
    });

    test('should update $selectedWalletIds store when settingsSaved is called', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1, 2, 3])),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [2],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      const selectedIds = scope.getState(notificationsSettingsModel.$selectedWalletIds);

      expect(selectedIds.size).toBe(1);
      expect(selectedIds.has(2)).toBe(true);
      expect(selectedIds.has(1)).toBe(false);
      expect(selectedIds.has(3)).toBe(false);
    });

    test('should persist settings across multiple save operations', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(
            notificationsSettingsModel.$notificationEvents,
            new Set([
              NotificationEvent.WALLET_CREATED,
              NotificationEvent.OPERATION_CREATED,
              NotificationEvent.OPERATION_EXECUTED,
              NotificationEvent.OPERATION_REJECTED,
            ]),
          )
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1, 2])),
      });

      // First save - disable some events
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1, 2],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(NOTIFICATION_EVENTS_KEY, [NotificationEvent.WALLET_CREATED]);

      // Second save - change wallet selection
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(SELECTED_WALLET_IDS_KEY, [1]);

      // Verify final state
      const events = scope.getState(notificationsSettingsModel.$notificationEvents);
      const walletIds = scope.getState(notificationsSettingsModel.$selectedWalletIds);

      expect(events.size).toBe(1);
      expect(walletIds.size).toBe(1);
    });
  });

  describe('saving empty selections', () => {
    test('should allow saving empty notification events (all disabled)', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1])),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1],
          notificationEvents: [], // Empty - all events disabled
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(NOTIFICATION_EVENTS_KEY, []);

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.size).toBe(0);
    });

    test('should allow saving empty wallet selection (no wallets selected)', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1])),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [], // Empty - no wallets selected
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(SELECTED_WALLET_IDS_KEY, []);

      const selectedIds = scope.getState(notificationsSettingsModel.$selectedWalletIds);

      expect(selectedIds.size).toBe(0);
    });
  });

  describe('settings restoration', () => {
    test('should restore saved notification events after settingsSaved', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(
            notificationsSettingsModel.$notificationEvents,
            new Set([NotificationEvent.WALLET_CREATED, NotificationEvent.OPERATION_CREATED]),
          )
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1])),
      });

      // Disable OPERATION_CREATED
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [1],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.has(NotificationEvent.WALLET_CREATED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_CREATED)).toBe(false);
      expect(events.has(NotificationEvent.OPERATION_EXECUTED)).toBe(false);
      expect(events.has(NotificationEvent.OPERATION_REJECTED)).toBe(false);
    });

    test('should restore saved wallet IDs after settingsSaved', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$selectedWalletIds, new Set([1, 2, 3])),
      });

      // Select only wallet 2
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          selectedWalletIds: [2],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
        },
      });

      const walletIds = scope.getState(notificationsSettingsModel.$selectedWalletIds);

      expect(walletIds.has(1)).toBe(false);
      expect(walletIds.has(2)).toBe(true);
      expect(walletIds.has(3)).toBe(false);
    });
  });
});
