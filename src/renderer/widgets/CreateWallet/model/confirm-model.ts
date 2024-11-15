import { combine, createEvent, restore } from 'effector';

import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type AddMultisigStore } from '../lib/types';

const formInitiated = createEvent<AddMultisigStore>();
const formSubmitted = createEvent();

const $confirmStore = restore(formInitiated, null).reset(formSubmitted);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    return store ? apis[store.chainId] : null;
  },
);

const $signerWallet = combine(
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

export const confirmModel = {
  $confirmStore,
  $signerWallet,
  $api,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
