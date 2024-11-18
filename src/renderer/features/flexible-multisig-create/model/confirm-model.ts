import { combine, createEvent, restore } from 'effector';

import { type Account, type Chain } from '@/shared/core';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';

type FormSubmitEvent = {
  signer: Account;
  fee: string;
  multisigDeposit: string;
  threshold: number;
  chain: Chain;
  name: string;
};

const formInitiated = createEvent<FormSubmitEvent>();
const formSubmitted = createEvent();

const $confirmStore = restore(formInitiated, null).reset(formSubmitted);

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    return store?.chain ? apis[store.chain.chainId] : null;
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
