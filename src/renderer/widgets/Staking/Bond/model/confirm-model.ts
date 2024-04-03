import { createEvent, combine, restore } from 'effector';

import { Chain, Account, Asset, type ProxiedAccount, Validator } from '@shared/core';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  chain: Chain;
  asset: Asset;
  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: string;
  description: string;

  fee: string;
  totalFee: string;
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

    return walletUtils.getWalletById(wallets, store.shards[0].walletId);
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

    return walletUtils.getWalletById(wallets, store.signatory?.walletId || store.shards[0].walletId);
  },
  { skipVoid: false },
);

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $proxiedWallet,
  $signerWallet,

  $api,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
