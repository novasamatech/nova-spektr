import { createStore, createEvent, forward } from 'effector';

import { WalletFamily } from '@renderer/shared/core';

const walletTypeSet = createEvent<WalletFamily>();
const clearWalletType = createEvent();

const $walletType = createStore<WalletFamily | null>(null).reset(clearWalletType);
forward({ from: walletTypeSet, to: $walletType });

export const walletPairingModel = {
  $walletType,
  events: {
    clearWalletType,
    walletTypeSet,
  },
};
