import { createEvent, createStore, sample } from 'effector';

import { type WalletFamily } from '@/shared/core';

const walletTypeSet = createEvent<WalletFamily>();
const walletTypeCleared = createEvent();

const $walletType = createStore<WalletFamily | null>(null).reset(walletTypeCleared);

sample({
  clock: walletTypeSet,
  target: $walletType,
});

export const walletPairingModel = {
  $walletType,
  events: {
    walletTypeCleared,
    walletTypeSet,
  },
};
