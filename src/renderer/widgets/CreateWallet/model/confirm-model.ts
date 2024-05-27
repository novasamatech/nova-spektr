import { createEvent, combine, restore } from 'effector';

import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';
import { AddMultisigStore } from '../lib/types';

const formInitiated = createEvent<AddMultisigStore>();
const formSubmitted = createEvent();

const $confirmStore = restore<AddMultisigStore>(formInitiated, null).reset(formSubmitted);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    return store?.chainId ? apis[store.chainId] : undefined;
  },
  { skipVoid: false },
);

const $initiatorWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.signer.walletId);
  },
  { skipVoid: false },
);

const $proxiedWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    //fixme no support for proxiy
    return undefined;
    // if (!store || !store.proxiedAccount) return undefined;

    // return walletUtils.getWalletById(wallets, store.proxiedAccount.walletId);
  },
  { skipVoid: false },
);

const $signerWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.signer.walletId || store.signer.walletId);
  },
  { skipVoid: false },
);

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $signerWallet,
  $proxiedWallet,
  $api,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
