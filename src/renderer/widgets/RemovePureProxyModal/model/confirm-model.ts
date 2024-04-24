import { createEvent, combine, restore } from 'effector';

import { Account, AccountId, Chain, ProxiedAccount, ProxyType } from '@shared/core';
import { networkModel } from '@entities/network';
import { Transaction } from '@entities/transaction';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  signatory?: Account;
  description: string;
  transaction: Transaction;
  spawner: AccountId;
  proxyType: ProxyType;
  chain?: Chain;
  account?: Account;
  proxiedAccount?: ProxiedAccount;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const $confirmStore = restore<Input>(formInitiated, null);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    return store?.chain ? apis[store.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $initiatorWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store || !store.account) return null;

    return walletUtils.getWalletById(wallets, store.account.walletId);
  },
  { skipVoid: false },
);

const $proxyWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
    accounts: walletModel.$accounts,
  },
  ({ store, wallets, accounts }) => {
    if (!store || !store.account) return null;

    const account = accounts.find((a) => a.accountId === (store.account as ProxiedAccount)?.proxyAccountId);

    if (!account) return null;

    return walletUtils.getWalletById(wallets, account.walletId);
  },
  { skipVoid: false },
);

const $signerWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store || !store.account) return null;

    return walletUtils.getWalletById(wallets, store.signatory?.walletId || store.account.walletId);
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

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $signerWallet,
  $proxyWallet,
  $proxiedWallet,
  $api,

  events: {
    formInitiated,
  },

  output: {
    formSubmitted,
  },
};
