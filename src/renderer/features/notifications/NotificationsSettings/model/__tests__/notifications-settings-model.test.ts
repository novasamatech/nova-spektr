import { allSettled, fork } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { NotificationEvent } from '@/shared/core';
import { notificationsSettingsModel } from '../notifications-settings-model';

// LocalStorage keys matching those in notification-model.ts
const NOTIFICATION_EVENTS_KEY = 'notification_events';
const DISABLED_WALLET_IDS_KEY = 'notification_disabled_wallet_ids';

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

    test('should start with empty disabled wallet list (all wallets enabled)', () => {
      const scope = fork({
        values: new Map().set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      const disabledIds = scope.getState(notificationsSettingsModel.$disabledWalletIds);

      // Initially empty - no wallets disabled means all enabled
      expect(disabledIds.size).toBe(0);
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
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      // Save with only some events enabled
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: [NotificationEvent.WALLET_CREATED, NotificationEvent.OPERATION_CREATED],
          soundEnabled: false,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(NOTIFICATION_EVENTS_KEY, [
        NotificationEvent.WALLET_CREATED,
        NotificationEvent.OPERATION_CREATED,
      ]);
    });

    test('should save disabled wallet IDs to localStorage when settingsSaved is called', async () => {
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
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      // Save with wallet 2 disabled
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [2],
          notificationEvents: [
            NotificationEvent.WALLET_CREATED,
            NotificationEvent.OPERATION_CREATED,
            NotificationEvent.OPERATION_EXECUTED,
            NotificationEvent.OPERATION_REJECTED,
          ],
          soundEnabled: false,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(DISABLED_WALLET_IDS_KEY, [2]);
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
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.size).toBe(1);
      expect(events.has(NotificationEvent.WALLET_CREATED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_CREATED)).toBe(false);
    });

    test('should update $disabledWalletIds store when settingsSaved is called', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [1, 3],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      const disabledIds = scope.getState(notificationsSettingsModel.$disabledWalletIds);

      expect(disabledIds.size).toBe(2);
      expect(disabledIds.has(1)).toBe(true);
      expect(disabledIds.has(3)).toBe(true);
      expect(disabledIds.has(2)).toBe(false);
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
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      // First save - disable some events
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(NOTIFICATION_EVENTS_KEY, [NotificationEvent.WALLET_CREATED]);

      // Second save - disable a wallet
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [2],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(DISABLED_WALLET_IDS_KEY, [2]);

      // Verify final state
      const events = scope.getState(notificationsSettingsModel.$notificationEvents);
      const disabledWalletIds = scope.getState(notificationsSettingsModel.$disabledWalletIds);

      expect(events.size).toBe(1);
      expect(disabledWalletIds.size).toBe(1);
    });
  });

  describe('saving empty selections', () => {
    test('should allow saving empty notification events (all disabled)', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: [], // Empty - all events disabled
          soundEnabled: false,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(NOTIFICATION_EVENTS_KEY, []);

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.size).toBe(0);
    });

    test('should allow saving all wallets disabled', async () => {
      const saveSpy = vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [1, 2, 3], // All wallets disabled
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      expect(saveSpy).toHaveBeenCalledWith(DISABLED_WALLET_IDS_KEY, [1, 2, 3]);

      const disabledIds = scope.getState(notificationsSettingsModel.$disabledWalletIds);

      expect(disabledIds.size).toBe(3);
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
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      // Disable OPERATION_CREATED
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      const events = scope.getState(notificationsSettingsModel.$notificationEvents);

      expect(events.has(NotificationEvent.WALLET_CREATED)).toBe(true);
      expect(events.has(NotificationEvent.OPERATION_CREATED)).toBe(false);
      expect(events.has(NotificationEvent.OPERATION_EXECUTED)).toBe(false);
      expect(events.has(NotificationEvent.OPERATION_REJECTED)).toBe(false);
    });

    test('should restore saved disabled wallet IDs after settingsSaved', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork({
        values: new Map()
          .set(notificationsSettingsModel.$notificationEvents, new Set([NotificationEvent.WALLET_CREATED]))
          .set(notificationsSettingsModel.$disabledWalletIds, new Set()),
      });

      // Disable wallet 2
      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [2],
          notificationEvents: [NotificationEvent.WALLET_CREATED],
          soundEnabled: false,
        },
      });

      const disabledWalletIds = scope.getState(notificationsSettingsModel.$disabledWalletIds);

      expect(disabledWalletIds.has(1)).toBe(false);
      expect(disabledWalletIds.has(2)).toBe(true);
      expect(disabledWalletIds.has(3)).toBe(false);
    });
  });

  describe('sound settings', () => {
    test('should have sound disabled by default', () => {
      const scope = fork();
      expect(scope.getState(notificationsSettingsModel.$soundEnabled)).toBe(false);
    });

    test('should update $soundEnabled when settingsSaved is called', async () => {
      vi.spyOn(localStorageService, 'saveToStorage').mockImplementation((_, value) => value);

      const scope = fork();

      await allSettled(notificationsSettingsModel.events.settingsSaved, {
        scope,
        params: {
          disabledWalletIds: [],
          notificationEvents: [],
          soundEnabled: true,
        },
      });

      expect(scope.getState(notificationsSettingsModel.$soundEnabled)).toBe(true);
    });
  });
});
