import { createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';
import { priceProviderModel } from '@/entities/price';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { assetsSearchModel, assetsSettingsModel, portfolioModel } from '@/features/assets';

const activeShardsSet = createEvent<AnyAccount[]>();

const $activeShards = createStore<AnyAccount[]>([]);

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
  source: walletSelect.$selectedWallet,
  filter: (wallet: Wallet | null) => nonNullable(wallet),
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => !accountUtils.isVaultBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: walletSelect.$selectedWallet,
  filter: (wallet: Wallet | null) => nonNullable(wallet),
  fn: (wallet) => {
    if (walletUtils.isFlexibleMultisig(wallet)) {
      return wallet.accounts.filter(accountUtils.isProxiedAccount);
    }
    if (!walletUtils.isPolkadotVault(wallet)) {
      return wallet?.accounts;
    }

    return wallet.accounts.filter((account) => !accountUtils.isVaultBaseAccount(account));
  },
  target: $activeShards,
});

export const assetsModel = {
  $activeShards,
  events: {
    activeShardsSet,
  },
};
