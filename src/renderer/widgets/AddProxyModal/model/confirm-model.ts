import { createEvent, combine, restore } from 'effector';

import { Chain, Account, ProxyType, Address } from '@shared/core';
import { networkModel } from '@entities/network';
import { Transaction } from '@entities/transaction';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  chain: Chain;
  account: Account;
  signatory?: Account;
  proxyType: ProxyType;
  delegate: Address;
  description: string;
  transaction: Transaction;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const $confirmStore = restore<Input>(formInitiated, null);
$confirmStore.watch((v) => {
  console.log('=== $confirmStore', v);
});

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
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.account.walletId);
  },
);

const $signerWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return null;

    return walletUtils.getWalletById(wallets, store.signatory?.walletId || store.account.walletId);
  },
);

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $signerWallet,
  $api,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
