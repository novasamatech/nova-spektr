import { createEvent, combine, restore } from 'effector';

import { Chain, Account, Asset, type ProxiedAccount } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  chain: Chain;
  asset: Asset;

  shards: BaseAccount[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  description: string;
};

const formInitiated = createEvent<Input>();
const formSubmitted = createEvent();

const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $confirmStore = restore(formInitiated, null);

const $feeData = restore(feeDataChanged, { fee: '0', totalFee: '0', multisigDeposit: '0' });
const $isFeeLoading = restore(isFeeLoadingChanged, true);

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

  $feeData,
  $isFeeLoading,

  events: {
    formInitiated,
    feeDataChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
