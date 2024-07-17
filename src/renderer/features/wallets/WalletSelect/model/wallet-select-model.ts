import BigNumber from 'bignumber.js';
import { attach, combine, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { once, previous } from 'patronum';

import { storageService } from '@shared/api/storage';
import type { Account, ID, Wallet } from '@shared/core';
import { dictionary, getRoundedValue, totalAmount } from '@shared/lib/utils';

import { balanceModel } from '@entities/balance';
import { networkModel } from '@entities/network';
import { currencyModel, priceProviderModel } from '@entities/price';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';

import { walletSelectUtils } from '../lib/wallet-select-utils';

export type Callbacks = {
  onClose: () => void;
};

const walletIdSet = createEvent<ID>();
const queryChanged = createEvent<string>();
const walletSelected = createEvent<ID>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $walletId = createStore<ID | null>(null);
const $filterQuery = createStore<string>('');

const $isWalletsRemoved = combine(
  {
    prevWallets: previous(walletModel.$wallets),
    wallets: walletModel.$wallets,
  },
  ({ prevWallets, wallets }) => {
    if (!prevWallets) return false;

    return prevWallets.length > wallets.length;
  },
);

const $isWalletsAdded = combine(
  {
    prevWallets: previous(walletModel.$wallets),
    wallets: walletModel.$wallets,
  },
  ({ prevWallets, wallets }) => {
    if (!prevWallets) return false;

    if (prevWallets.length > 0) return wallets.length > prevWallets.length;

    return wallets.length === 1 && !wallets[0].isActive;
  },
);

const $walletForDetails = combine(
  {
    walletId: $walletId,
    wallets: walletModel.$wallets,
  },
  ({ wallets, walletId }): Wallet | undefined => {
    if (!walletId) return;

    return walletUtils.getWalletById(wallets, walletId);
  },
  { skipVoid: false },
);

const $filteredWalletGroups = combine(
  {
    query: $filterQuery,
    wallets: walletModel.$wallets,
  },
  ({ wallets, query }) => {
    return walletSelectUtils.getWalletByGroups(wallets, query);
  },
);

const $walletBalance = combine(
  {
    wallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
    balances: balanceModel.$balances,
    currency: currencyModel.$activeCurrency,
    prices: priceProviderModel.$assetsPrices,
  },
  (params): BigNumber => {
    const { wallet, chains, balances, prices, currency } = params;

    if (!wallet || !prices || !balances || !currency?.coingeckoId) return new BigNumber(0);

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const accountMap = dictionary(wallet.accounts as Account[], 'accountId');

    return balances.reduce<BigNumber>((acc, balance) => {
      const account = accountMap[balance.accountId];
      if (!account) return acc;
      if (accountUtils.isBaseAccount(account) && isPolkadotVault) return acc;

      const asset = chains[balance.chainId]?.assets?.find((asset) => asset.assetId.toString() === balance.assetId);

      if (!asset?.priceId || !prices[asset.priceId]) return acc;

      const price = prices[asset.priceId][currency.coingeckoId];
      if (price) {
        const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        acc = acc.plus(new BigNumber(fiatBalance));
      }

      return acc;
    }, new BigNumber(0));
  },
);

const walletSelectedFx = createEffect(async (nextId: ID): Promise<ID | undefined> => {
  const wallets = await storageService.wallets.readAll();
  const inactiveWallets = wallets.filter((wallet) => wallet.isActive).map((wallet) => ({ ...wallet, isActive: false }));

  const [, nextWallet] = await Promise.all([
    storageService.wallets.updateAll(inactiveWallets),
    storageService.wallets.update(nextId, { isActive: true }),
  ]);

  return nextWallet;
});

sample({ clock: queryChanged, target: $filterQuery });

sample({ clock: walletIdSet, target: $walletId });

sample({
  clock: once(walletModel.$wallets),
  filter: (wallets) => wallets.every((wallet) => !wallet.isActive),
  fn: (wallets) => {
    const match = wallets.find((wallet) => wallet.isActive);
    if (match) return match.id;

    const groups = walletSelectUtils.getWalletByGroups(wallets);

    return Object.values(groups).flat()[0].id;
  },
  target: walletSelectedFx,
});

sample({ clock: walletSelected, target: walletSelectedFx });

sample({
  clock: $isWalletsRemoved,
  source: walletModel.$wallets,
  filter: (wallets, isWalletsRemoved) => {
    if (!isWalletsRemoved || wallets.length === 0) return false;

    return wallets.every((wallet) => !wallet.isActive);
  },
  fn: (wallets) => {
    const groups = walletSelectUtils.getWalletByGroups(wallets);

    return Object.values(groups).flat()[0].id;
  },
  target: walletSelectedFx,
});

sample({
  clock: $isWalletsAdded,
  source: walletModel.$wallets,
  filter: (wallets, isWalletsAdded) => {
    return isWalletsAdded && !walletUtils.isProxied(wallets[wallets.length - 1]);
  },
  fn: (wallets) => wallets[wallets.length - 1].id,
  target: walletSelectedFx,
});

sample({
  clock: walletSelected,
  source: walletModel.$activeWallet,
  filter: (wallet, walletId) => walletId !== wallet?.id,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onClose(),
  }),
});

sample({
  clock: walletSelectedFx.doneData,
  source: walletModel.$wallets,
  filter: (_, nextId) => Boolean(nextId),
  fn: (wallets, nextId) => {
    return wallets.map((wallet) => ({ ...wallet, isActive: wallet.id === nextId }));
  },
  target: walletModel.$wallets,
});

export const walletSelectModel = {
  $filteredWalletGroups,
  $walletBalance,
  $walletForDetails,
  events: {
    walletSelected,
    walletIdSet,
    queryChanged,
    clearData: $filterQuery.reinit,
    walletIdCleared: $walletId.reinit,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
