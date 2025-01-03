import { createEvent, restore, sample } from 'effector';
import { readonly } from 'patronum';

import { type WalletFamily } from '@/shared/core';

const walletTypeSet = createEvent<WalletFamily>();
const walletTypeCleared = createEvent();

const $walletType = restore(walletTypeSet, null).reset(walletTypeCleared);

sample({
  clock: walletTypeSet,
  target: $walletType,
});

export const walletPairingModel = {
  $walletType: readonly($walletType),
  events: {
    walletTypeCleared,
    walletTypeSet,
  },
};
