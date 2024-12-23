import { createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { type Account, type Wallet } from '@/shared/core';
import { priceProviderModel } from '@/entities/price';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { assetsSearchModel, assetsSettingsModel, portfolioModel } from '@/features/assets';

const activeShardsSet = createEvent<Account[]>();

const $activeShards = createStore<Account[]>([]);

sample({
  clock: [assetsSettingsModel.$assetsView, once(assetsSettingsModel.events.assetsStarted)],
  source: assetsSettingsModel.$assetsView,
  target: portfolioModel.events.activeViewChanged,
});

sample({
  clock: assetsSettingsModel.$hideZeroBalances,
  target: portfolioModel.events.hideZeroBalancesChanged,
});

sample({
  clock: assetsSearchModel.$query,
  target: portfolioModel.events.queryChanged,
});

sample({
  clock: assetsSettingsModel.events.assetsStarted,
  fn: () => ({ includeRates: true }),
  target: priceProviderModel.events.assetsPricesRequested,
});

sample({
  clock: activeShardsSet,
  source: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => !accountUtils.isVaultBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet) => {
    if (!walletUtils.isPolkadotVault(wallet)) return wallet.accounts;

    return wallet.accounts.filter((account) => !accountUtils.isVaultBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: $activeShards,
  target: portfolioModel.events.accountsChanged,
});

export const assetsModel = {
  $activeShards,
  events: {
    activeShardsSet,
  },
};
