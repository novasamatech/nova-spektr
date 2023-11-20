import { createStore, createEvent, forward } from 'effector';

import { WalletFamily } from '@shared/core';

const walletTypeSet = createEvent<WalletFamily>();
const walletTypeCleared = createEvent();

const $walletType = createStore<WalletFamily | null>(null).reset(walletTypeCleared);

forward({ from: walletTypeSet, to: $walletType });

export const walletPairingModel = {
  $walletType,
  events: {
    walletTypeCleared,
    walletTypeSet,
  },
};
