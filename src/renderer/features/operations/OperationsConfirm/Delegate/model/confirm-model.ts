import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, restore } from 'effector';

import {
  type Account,
  type Address,
  type Asset,
  type Chain,
  type ChainId,
  type Conviction,
  type ProxiedAccount,
  type Wallet,
} from '@shared/core';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';

type Input = {
  id?: number;
  chain: Chain;
  asset: Asset;
  shards: Account[];
  transferable: string;

  tracks: number[];
  target: Address;
  conviction: Conviction;
  balance: string;

  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const formInitiated = createEvent<Input[]>();
const formSubmitted = createEvent();

const $confirmStore = restore(formInitiated, null);

const $storeMap = combine($confirmStore, (store) => {
  return (
    store?.reduce<Record<number, Input>>(
      (acc, input, index) => ({
        ...acc,
        [input.id ?? index]: input,
      }),
      {},
    ) || {}
  );
});

const $apis = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    if (!store) return {};

    return store.reduce(
      (acc, payload) => {
        const chainId = payload.chain.chainId;
        const api = apis[chainId];

        if (!api) return acc;

        return {
          ...acc,
          [chainId]: api,
        };
      },
      {} as Record<ChainId, ApiPromise>,
    );
  },
);

const $initiatorWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      const wallet = walletUtils.getWalletById(wallets, storeItem.shards[0].walletId);
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

const $proxiedWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      if (!storeItem.proxiedAccount) return acc;

      const wallet = walletUtils.getWalletById(wallets, storeItem.proxiedAccount.walletId);
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

const $signerWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      const wallet = walletUtils.getWalletById(wallets, storeItem.signatory?.walletId || storeItem.shards[0].walletId);
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

export const confirmModel = {
  $confirmStore: $storeMap,
  $initiatorWallets,
  $proxiedWallets,
  $signerWallets,

  $apis,
  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
