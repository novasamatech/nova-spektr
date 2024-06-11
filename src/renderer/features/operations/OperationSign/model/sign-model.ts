import { createEvent, restore, combine, sample } from 'effector';
import { once } from 'patronum';

import type { Chain, Account, HexString, Transaction } from '@shared/core';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';

// TODO: Use it for signing
// type Input = {
//   signingPayloads: SigningPayload[];
// };

// type SigningPayload = {
//   chain: Chain;
//   account: Account;
//   transaction: Transaction;
//   signatory?: Account;
// };

type Input = {
  chain: Chain;
  accounts: Account[];
  signatory?: Account;
  transactions: Transaction[];
};

type SignatureData = {
  signatures: HexString[];
  txPayloads: Uint8Array[];
};

const formInitiated = createEvent<Input>();
const dataReceived = createEvent<SignatureData>();
const formSubmitted = createEvent<SignatureData>();

const $signStore = restore<Input>(formInitiated, null);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $signStore,
  },
  ({ apis, store }) => {
    return store?.chain ? apis[store.chain.chainId] : undefined;
  },
  { skipVoid: false },
);

const $signerWallet = combine(
  {
    store: $signStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.accounts[0].walletId);
  },
  { skipVoid: false },
);

sample({
  clock: once({ source: dataReceived, reset: formInitiated }),
  target: formSubmitted,
});

export const signModel = {
  $signStore,
  $api,
  $signerWallet,
  events: {
    formInitiated,
    dataReceived,
  },
  output: {
    formSubmitted,
  },
};
