import { createEvent, sample, createStore } from 'effector';

import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { Account, Wallet } from '@shared/core';

const activeShardsSet = createEvent<Account[]>();

const $activeShards = createStore<Account[]>([]);

sample({
  clock: activeShardsSet,
  source: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => !accountUtils.isBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet) => {
    if (!walletUtils.isPolkadotVault(wallet)) return wallet.accounts;

    return wallet.accounts.filter((account) => !accountUtils.isBaseAccount(account));
  },
  target: $activeShards,
});

export const assetsModel = {
  $activeShards,
  events: {
    activeShardsSet,
  },
};
