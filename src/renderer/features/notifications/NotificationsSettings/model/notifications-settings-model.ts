import { combine, sample } from 'effector';

import { $walletNameCache, createWalletNameCacheKey, walletsNameResource } from '@/domains/network';
import { notificationModel } from '@/entities/notification';
import { walletModel, walletUtils } from '@/entities/wallet';

// Filter wallets to only include multisig and flexible multisig types
const $multisigWallets = walletModel.$allWallets.map((wallets) => wallets.filter(walletUtils.isMultisig));

const $walletsWithResolvedNames = combine($multisigWallets, $walletNameCache, (wallets, nameCache) => {
  return wallets.map((wallet) => {
    const key = createWalletNameCacheKey({ wallet });
    const resolvedName = nameCache[key];
    return resolvedName ? { ...wallet, name: resolvedName } : wallet;
  });
});

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

sample({
  clock: $multisigWallets,
  filter: (wallets) => wallets.length > 0,
  fn: (wallets) => ({ wallets }),
  target: walletsNameResource.start,
});

export const notificationsSettingsModel = {
  // Stores (from entity)
  $notificationEvents,
  $disabledWalletIds,
  $soundEnabled,
  // Filtered wallets for notifications (only multisig types)
  $wallets: $walletsWithResolvedNames,
  // Events (from entity)
  events: {
    settingsSaved: notificationModel.events.settingsSaved,
    soundPlayed: notificationModel.events.soundPlayed,
  },
};
