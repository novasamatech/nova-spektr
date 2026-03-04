import { createEffect, createEvent, createStore, sample } from 'effector';
import { t } from 'i18next';
import { or } from 'patronum';
import { toast } from 'sonner';

import { type ID, type NotificationEvent } from '@/shared/core';
import { createForm } from '@/shared/forms';
import { nonNullable } from '@/shared/lib/utils';
import { notificationModel } from '@/entities/notification';
import { walletModel, walletUtils } from '@/entities/wallet';

const $multisigWallets = walletModel.$allWallets.map((wallets) => wallets.filter(walletUtils.isAnyMultisig));

const $notificationEvents = notificationModel.$notificationEvents;
const $disabledWalletIds = notificationModel.$disabledWalletIds;
const $soundEnabled = notificationModel.$soundEnabled;

type SettingsSnapshot = {
  disabledWalletIds: ID[];
  notificationEvents: NotificationEvent[];
  soundEnabled: boolean;
};

const $previousSettings = createStore<SettingsSnapshot | null>(null);
const $activeToastId = createStore<string | number | null>(null);

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
const modalClosed = createEvent<SettingsSnapshot>();
const undoSettings = createEvent();

const showSettingsSavedToastFx = createEffect((activeToastId: string | number | null) => {
  if (activeToastId) {
    toast.dismiss(activeToastId);
  }

  return toast.success(t('settings.notificationsSettings.settingsSaved'), {
    action: {
      label: t('settings.notificationsSettings.undoButton'),
      onClick: () => undoSettings(),
    },
  });
});

const showSettingsRestoredToastFx = createEffect(() => {
  toast.success(t('settings.notificationsSettings.settingsRestored'));
});

// Track active toast ID
$activeToastId.on(showSettingsSavedToastFx.doneData, (_, id) => id);
$activeToastId.on(undoSettings, () => null);

sample({
  clock: formOpened,
  target: form.reset,
});

sample({
  clock: [formOpened, $disabledWalletIds, $notificationEvents, $soundEnabled],
  source: {
    disabledWalletIds: $disabledWalletIds,
    notificationEvents: $notificationEvents,
    soundEnabled: $soundEnabled,
  },
  target: form.setForm,
});

// Save current settings as previous when form opens
sample({
  clock: formOpened,
  source: {
    disabledWalletIds: $disabledWalletIds,
    notificationEvents: $notificationEvents,
    soundEnabled: $soundEnabled,
  },
  fn: ({ disabledWalletIds, notificationEvents, soundEnabled }) => ({
    disabledWalletIds: [...disabledWalletIds],
    notificationEvents: [...notificationEvents],
    soundEnabled,
  }),
  target: $previousSettings,
});

// Save settings when modal closes
sample({
  clock: modalClosed,
  target: notificationModel.events.settingsSaved,
});

// Show toast when modal closes
sample({
  clock: modalClosed,
  source: $activeToastId,
  target: showSettingsSavedToastFx,
});

// Restore previous settings on undo
sample({
  clock: undoSettings,
  source: $previousSettings,
  filter: (settings): settings is SettingsSnapshot => nonNullable(settings),
  target: notificationModel.events.settingsSaved,
});

// Show restored toast on undo
sample({
  clock: undoSettings,
  target: showSettingsRestoredToastFx,
});

const $isTouched = or(
  form.fields.disabledWalletIds.$touched,
  form.fields.notificationEvents.$touched,
  form.fields.soundEnabled.$touched,
);

export const notificationsSettingsModel = {
  $notificationEvents,
  $disabledWalletIds,
  $soundEnabled,

  $wallets: $multisigWallets,

  form,
  $isTouched,

  events: {
    formOpened,
    modalClosed,
    soundPlayed: notificationModel.events.soundPlayed,
  },
};
