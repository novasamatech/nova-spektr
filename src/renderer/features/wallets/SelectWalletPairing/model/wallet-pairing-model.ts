import { createStore, createEvent, sample } from 'effector';

import { WalletFamily } from '@shared/core';

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
