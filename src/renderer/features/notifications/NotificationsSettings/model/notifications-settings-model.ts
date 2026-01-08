import { createEvent, sample } from 'effector';
import { or } from 'patronum';

import { type ID, type NotificationEvent } from '@/shared/core';
import { createForm } from '@/shared/forms';
import { notificationModel } from '@/entities/notification';
import { walletModel, walletUtils } from '@/entities/wallet';

const $multisigWallets = walletModel.$allWallets.map((wallets) => wallets.filter(walletUtils.isMultisig));

const $notificationEvents = notificationModel.$notificationEvents;
const $disabledWalletIds = notificationModel.$disabledWalletIds;
const $soundEnabled = notificationModel.$soundEnabled;

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
    settingsSaved: notificationModel.events.settingsSaved,
    soundPlayed: notificationModel.events.soundPlayed,
  },
};
