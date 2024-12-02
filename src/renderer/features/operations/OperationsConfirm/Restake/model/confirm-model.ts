import { combine, createEvent, restore, sample } from 'effector';

import {
  type Account,
  type Asset,
  type Chain,
  type ProxiedAccount,
  type Transaction,
  type Wallet,
} from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { operationsModel, operationsUtils } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';

type Input = {
  id?: number;
  chain: Chain;
  asset: Asset;
  shards: Account[];
  proxiedAccount?: ProxiedAccount;
  signatory: Account | null;
  amount: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
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

const $initiatorWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      if (!storeItem.shards[0]) return acc;

      const wallet = walletUtils.getWalletById(wallets, storeItem.shards[0]?.walletId);
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
      const wallet = walletUtils.getWalletById(
        wallets,
        (storeItem.signatory?.walletId || storeItem.shards[0]?.walletId)!,
      );
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

sample({
  clock: formInitiated,
  target: $confirmStore,
});

const $isMultisigExists = combine(
  {
    apis: networkModel.$apis,
    coreTxs: $storeMap.map((storeMap) =>
      Object.values(storeMap)
        .map((store) => store.coreTx)
        .filter(nonNullable),
    ),
    transactions: operationsModel.$multisigTransactions,
  },
  ({ apis, coreTxs, transactions }) => operationsUtils.isMultisigAlreadyExists({ apis, coreTxs, transactions }),
);

export const confirmModel = {
  $confirmStore: $storeMap,
  $initiatorWallets,
  $signerWallets,
  $proxiedWallets,
  $isMultisigExists,

  events: {
    formInitiated,
  },
  output: {
    formSubmitted,
  },
};
