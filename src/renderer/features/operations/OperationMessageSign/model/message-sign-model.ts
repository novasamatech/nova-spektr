import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type MessageSignatureResult, type MessageSigningPayload } from '../lib/types';

const flow = createGate();

const init = createEvent<MessageSigningPayload>();
const chainIdChanged = createEvent<ChainId>();
const signed = createEvent<MessageSignatureResult>();

const $signStore = createStore<MessageSigningPayload | null>(null).reset(flow.close);

sample({
  clock: init,
  target: $signStore,
});

$signStore.on(chainIdChanged, (store, chainId) => (store ? { ...store, chainId } : store));

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
  chainIdChanged,
  signed,

  gates: {
    flow,
  },
};
