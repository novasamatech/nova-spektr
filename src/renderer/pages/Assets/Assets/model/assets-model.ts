import { createEvent, sample, createStore } from 'effector';

import type { Account } from '@shared/core';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';

const activeShardsSet = createEvent<Account[]>();

const $activeShards = createStore<Account[]>([]);

sample({
  clock: [activeShardsSet, walletModel.$activeAccounts],
  source: walletModel.$activeWallet,
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => {
      return account && !accountUtils.isBaseAccount(account);
    });
  },
  target: $activeShards,
});

export const assetsModel = {
  $activeShards,
  events: {
    activeShardsSet,
  },
};
