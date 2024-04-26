import { createEvent, sample, createStore } from 'effector';

import type { Account } from '@shared/core';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { AssetsPageView } from '@entities/asset';
import { assetsSettingsModel } from '@features/assets';

const $activeShards = createStore<Account[]>([]);
const $title = createStore('');

const activeShardsSet = createEvent<Account[]>();

sample({
  clock: assetsSettingsModel.outputs.assetsViewData,
  fn: (assetsViewData) =>
    assetsViewData === AssetsPageView.TOKEN_CENTRIC ? 'balances.portfolioTitle' : 'balances.title',
  target: $title,
});

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
  $title,
  events: {
    activeShardsSet,
  },
};
