import { createEvent, combine, restore } from 'effector';
import { ApiPromise } from '@polkadot/api';

import { Chain, Account, Asset, type ProxiedAccount, Validator, Wallet, ChainId } from '@shared/core';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';
import { BN } from '@polkadot/util';

type Input = {
  id?: number;
  chain: Chain;
  asset: Asset;

  shards: Account[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: string;
  description: string;
};

const formInitiated = createEvent<Input[]>();
const formSubmitted = createEvent();

const feeDataChanged = createEvent<Record<'fee' | 'totalFee' | 'multisigDeposit', string>>();
const isFeeLoadingChanged = createEvent<boolean>();

const $confirmStore = restore(formInitiated, null);

const $feeData = restore(feeDataChanged, { fee: '0', totalFee: '0', multisigDeposit: '0' });
const $isFeeLoading = restore(isFeeLoadingChanged, true);

const $apis = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    if (!store) return {};

    return store.reduce((acc, payload) => {
      const chainId = payload.chain.chainId;
      const api = apis[chainId];

      if (!api) return acc;

      return {
        ...acc,
        [chainId]: api,
      };
    }, {} as Record<ChainId, ApiPromise>);
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
      if (!storeItem.proxiedAccount) return acc;

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

const $eraLength = combine($apis, (apis) => {
  if (!apis) return {};

  return Object.entries(apis).reduce<Record<ChainId, number>>(
    (acc, [chainId, api]) => ({
      ...acc,
      [chainId as ChainId]: (api.consts.staking.sessionsPerEra as unknown as BN).toNumber(),
    }),
    {},
  );
});

export const confirmModel = {
  $confirmStore: $confirmStore.map(
    (store) =>
      store?.reduce<Record<number, Input>>(
        (acc, input, index) => ({
          ...acc,
          [input.id ?? index]: input,
        }),
        {},
      ) || {},
  ),
  $initiatorWallets,
  $proxiedWallets,
  $signerWallets,
  $eraLength,

  $feeData,
  $isFeeLoading,

  $apis,
  events: {
    formInitiated,
    feeDataChanged,
    isFeeLoadingChanged,
  },
  output: {
    formSubmitted,
  },
};
