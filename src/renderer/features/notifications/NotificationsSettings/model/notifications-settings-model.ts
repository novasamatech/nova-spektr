import { createEffect, createEvent, createStore, sample } from 'effector';

import { localStorageService } from '@/shared/api/local-storage';
import { type ID } from '@/shared/core';
import { walletModel } from '@/entities/wallet';
import { NOTIFICATION_EVENTS, NotificationEvent, SELECTED_WALLET_IDS } from '../lib/constants';

const notificationEventToggled = createEvent<NotificationEvent>();
const walletToggled = createEvent<ID>();
const allWalletsToggled = createEvent<boolean>();
const selectedWalletsChanged = createEvent<ID[]>();

const initialNotificationEvents = localStorageService.getFromStorage(NOTIFICATION_EVENTS, [
  NotificationEvent.WALLET_CREATED,
  NotificationEvent.OPERATION_CREATED,
  NotificationEvent.OPERATION_EXECUTED,
  NotificationEvent.OPERATION_REJECTED,
]);

const initialSelectedWalletIds = localStorageService.getFromStorage<ID[] | null>(SELECTED_WALLET_IDS, null);

const $notificationEvents = createStore<Set<NotificationEvent>>(new Set(initialNotificationEvents));
const $selectedWalletIds = createStore<Set<ID>>(
  initialSelectedWalletIds === null ? new Set() : new Set(initialSelectedWalletIds),
);

// Initialize with all wallets if no saved selection
sample({
  clock: walletModel.$allWallets,
  source: $selectedWalletIds,
  filter: (selectedIds, wallets) => initialSelectedWalletIds === null && selectedIds.size === 0 && wallets.length > 0,
  fn: (_, wallets) => new Set(wallets.map((w) => w.id)),
  target: $selectedWalletIds,
});

const $allWalletsSelected = sample({
  source: { wallets: walletModel.$allWallets, selectedIds: $selectedWalletIds },
  fn: ({ wallets, selectedIds }) => {
    if (wallets.length === 0) return false;
    return wallets.every((w) => selectedIds.has(w.id));
  },
});

const saveNotificationEventsFx = createEffect((value: NotificationEvent[]): NotificationEvent[] => {
  return localStorageService.saveToStorage(NOTIFICATION_EVENTS, value);
});

const saveSelectedWalletIdsFx = createEffect((value: ID[]): ID[] => {
  return localStorageService.saveToStorage(SELECTED_WALLET_IDS, value);
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

sample({
  clock: walletToggled,
  source: $selectedWalletIds,
  fn: (selectedIds, walletId) => {
    const newIds = new Set(selectedIds);
    if (newIds.has(walletId)) {
      newIds.delete(walletId);
    } else {
      newIds.add(walletId);
    }
    return newIds;
  },
  target: $selectedWalletIds,
});

sample({
  clock: allWalletsToggled,
  source: walletModel.$allWallets,
  fn: (wallets, selectAll) => {
    if (selectAll) {
      return new Set(wallets.map((w) => w.id));
    }
    return new Set<ID>();
  },
  target: $selectedWalletIds,
});

sample({
  clock: selectedWalletsChanged,
  fn: (walletIds) => new Set(walletIds),
  target: $selectedWalletIds,
});

sample({
  clock: $selectedWalletIds,
  fn: (selectedIds) => Array.from(selectedIds),
  target: saveSelectedWalletIdsFx,
});

export const notificationsSettingsModel = {
  $notificationEvents,
  $selectedWalletIds,
  $allWalletsSelected,
  events: {
    notificationEventToggled,
    walletToggled,
    allWalletsToggled,
    selectedWalletsChanged,
  },
};
