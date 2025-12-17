import { sample } from 'effector';

import { notificationModel } from '@/entities/notification';
import { walletModel, walletUtils } from '@/entities/wallet';

// Filter wallets to only include multisig and flexible multisig types
const $multisigWallets = walletModel.$allWallets.map((wallets) => wallets.filter(walletUtils.isMultisig));

// Re-export settings state from notification entity
const $notificationEvents = notificationModel.$notificationEvents;
const $disabledWalletIds = notificationModel.$disabledWalletIds;
const $soundEnabled = notificationModel.$soundEnabled;

// Connect wallet updates to notification model
// This bridges the two entities from the feature layer (only multisig wallets)
sample({
  clock: $multisigWallets,
  target: notificationModel.events.walletsUpdated,
});

export const notificationsSettingsModel = {
  // Stores (from entity)
  $notificationEvents,
  $disabledWalletIds,
  $soundEnabled,

  // Filtered wallets for notifications (only multisig types)
  $wallets: $multisigWallets,

  // Events (from entity)
  events: {
    settingsSaved: notificationModel.events.settingsSaved,
    soundPlayed: notificationModel.events.soundPlayed,
  },
};
