import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { nullable } from '@/shared/lib/utils';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type MessageSignatureResult, type MessageSigningPayload } from '../lib/types';

const flow = createGate();

const init = createEvent<MessageSigningPayload>();
const signed = createEvent<MessageSignatureResult>();

const $signStore = createStore<MessageSigningPayload | null>(null).reset(flow.close);

sample({
  clock: init,
  target: $signStore,
});

const $signerWallet = combine(
  {
    store: $signStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (nullable(store)) return null;

    return walletUtils.getWalletById(wallets, store.signatory.walletId);
  },
);

export const messageSignModel = {
  $signStore,
  $signerWallet,

  init,
  signed,

  gates: {
    flow,
  },
};
