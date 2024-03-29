import { createEvent, combine, sample, restore } from 'effector';

import { Chain, Account, Address, Asset, type ProxiedAccount } from '@shared/core';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  xcmChain: Chain;
  chain: Chain;
  asset: Asset;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: Address;
  description: string;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const $confirmStore = restore(formInitiated, null);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    return store ? apis[store.chain.chainId] : null;
  },
);

const $initiatorWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.account.walletId);
  },
  { skipVoid: false },
);

const $proxiedWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store || !store.proxiedAccount) return undefined;

    return walletUtils.getWalletById(wallets, store.proxiedAccount.walletId);
  },
  { skipVoid: false },
);

const $signerWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.signatory?.walletId || store.account.walletId);
  },
  { skipVoid: false },
);

const $isXcm = combine($confirmStore, (confirmStore) => {
  if (!confirmStore) return false;

  return confirmStore.xcmChain.chainId !== confirmStore.chain.chainId;
});

sample({
  clock: formInitiated,
  target: $confirmStore,
});

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $proxiedWallet,
  $signerWallet,

  $api,
  $isXcm,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
