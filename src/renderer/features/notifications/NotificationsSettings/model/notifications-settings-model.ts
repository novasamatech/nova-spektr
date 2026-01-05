import { combine, createEvent, sample } from 'effector';

import { type ID, type NotificationEvent } from '@/shared/core';
import { createForm } from '@/shared/forms';
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

type FormParams = {
  disabledWalletIds: Set<ID>;
  notificationEvents: Set<NotificationEvent>;
  soundEnabled: boolean;
};

const form = createForm<FormParams>({
  fields: {
    disabledWalletIds: {
      defaultValue: new Set<ID>(),
    },
    notificationEvents: {
      defaultValue: new Set<NotificationEvent>(),
    },
    soundEnabled: {
      defaultValue: false,
    },
  },
  validateOn: ['change'],
});

const formOpened = createEvent();

// Reset form when opened (to clear touched state)
sample({
  clock: formOpened,
  target: form.reset,
});

// Set saved values when form is opened (runs after reset in same tick)
sample({
  clock: formOpened,
  source: {
    disabledWalletIds: $disabledWalletIds,
    notificationEvents: $notificationEvents,
    soundEnabled: $soundEnabled,
  },
  target: form.setForm,
});

const $isTouched = combine(
  {
    wallets: form.fields.disabledWalletIds.$touched,
    events: form.fields.notificationEvents.$touched,
    sound: form.fields.soundEnabled.$touched,
  },
  ({ wallets, events, sound }) => wallets || events || sound,
);

export const notificationsSettingsModel = {
  // Stores (from entity)
  $notificationEvents,
  $disabledWalletIds,
  $soundEnabled,

  // Filtered wallets for notifications (only multisig types)
  $wallets: $multisigWallets,

  // Form
  form,
  $isTouched,

  // Events (from entity)
  events: {
    formOpened,
    settingsSaved: notificationModel.events.settingsSaved,
    soundPlayed: notificationModel.events.soundPlayed,
  },
};
