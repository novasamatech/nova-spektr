import { createEvent, combine, sample, createStore } from 'effector';
import { spread } from 'patronum';

import { Chain, Account, Address, Asset } from '@shared/core';
import { networkModel } from '@entities/network';
import { Transaction } from '@entities/transaction';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  transaction: Transaction;
  payload: ConfirmData;
};

type ConfirmData = {
  chain: Chain;
  asset: Asset;
  account: Account;
  signatory?: Account;
  amount: string;
  destination: Address;
  description: string;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const $confirmStore = createStore<ConfirmData | null>(null);
const $transaction = createStore<Transaction | null>(null);

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

sample({
  clock: formInitiated,
  target: spread({
    transaction: $transaction,
    payload: $confirmStore,
  }),
});

export const confirmModel = {
  $confirmStore,
  $transaction,
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
