import { sample } from 'effector';

import { notificationModel } from '@/entities/notification';
import { walletModel } from '@/entities/wallet';

// Re-export settings state from notification entity
const $notificationEvents = notificationModel.$notificationEvents;
const $selectedWalletIds = notificationModel.$selectedWalletIds;
const $soundEnabled = notificationModel.$soundEnabled;

// Connect wallet updates to notification model
// This bridges the two entities from the feature layer
sample({
  clock: walletModel.$allWallets,
  target: notificationModel.events.walletsUpdated,
});

export const notificationsSettingsModel = {
  // Stores (from entity)
  $notificationEvents,
  $selectedWalletIds,
  $soundEnabled,

  // Events (from entity)
  events: {
    settingsSaved: notificationModel.events.settingsSaved,
    soundPlayed: notificationModel.events.soundPlayed,
  },
};
