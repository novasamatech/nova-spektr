import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, restore, sample } from 'effector';

import { transferableAmount } from '@/shared/lib/utils';
import { type Wallet } from '@shared/core';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel, walletUtils } from '@entities/wallet';
import { type UnlockFormData } from '@features/governance/types/structs';

const formInitiated = createEvent<UnlockFormData[]>();
const formSubmitted = createEvent();

const $confirmStore = restore(formInitiated, null);

const $storeMap = combine($confirmStore, (store) => {
  return (
    store?.reduce<Record<number, UnlockFormData>>(
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
      const wallet = walletUtils.getWalletById(wallets, storeItem.signatory?.walletId || storeItem.shards[0]?.walletId);
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

const $transferableAmount = combine(
  {
    store: $confirmStore,
    balances: balanceModel.$balances,
  },
  ({ store, balances }) => {
    if (!store) return {};

    return store.reduce<Record<number, BN>>((acc, storeItem, index) => {
      const accountId = storeItem.proxiedAccount ? storeItem.proxiedAccount.accountId : storeItem.shards[0]?.accountId;
      const amount = storeItem.shards.reduce((acc) => {
        const balance = balanceUtils.getBalance(
          balances,
          accountId,
          storeItem.chain.chainId,
          storeItem.asset.assetId.toString(),
        );

        return acc.add(new BN(transferableAmount(balance)));
      }, BN_ZERO);

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: amount,
      };
    }, {});
  },
);

export const unlockConfirmAggregate = {
  $confirmStore: $storeMap,
  $initiatorWallets,
  $signerWallets,
  $proxiedWallets,
  $transferableAmount,

  events: {
    formInitiated,
  },

  output: {
    formSubmitted,
  },
};
