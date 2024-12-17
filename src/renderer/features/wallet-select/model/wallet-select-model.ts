import { default as BigNumber } from 'bignumber.js';
import { attach, combine, createApi, createEvent, createStore, restore, sample } from 'effector';
import { once } from 'patronum';

import { type Account } from '@/shared/core';
import { dictionary, getRoundedValue, nonNullable, totalAmount } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelectService } from '../service/walletSelectService';

export type Callbacks = {
  onClose: () => void;
};

const queryChanged = createEvent<string>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $filterQuery = restore(queryChanged, '');

const $filteredWalletGroups = combine(
  {
    query: $filterQuery,
    wallets: walletModel.$wallets,
  },
  ({ wallets, query }) => {
    return walletSelectService.getWalletByGroups(wallets, query);
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
  (params) => {
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

sample({
  clock: queryChanged,
  target: $filterQuery,
});

const select = sample({
  clock: walletModel.$wallets,
  filter: (wallets) => wallets.every((wallet) => !wallet.isActive),
  fn: (wallets) => walletSelectService.getFirstWallet(wallets)?.id ?? null,
});

sample({
  clock: select.filter({ fn: nonNullable }),
  target: walletModel.events.selectWallet,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  filter: ({ external }) => !external,
  fn: ({ wallet }) => wallet.id,
  target: walletModel.events.selectWallet,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  fn: ({ result }) => result.id,
  target: walletModel.events.selectWallet,
});

sample({
  clock: walletModel.events.selectWallet,
  source: walletModel.$activeWallet,
  filter: (wallet, walletId) => walletId !== wallet?.id,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onClose(),
  }),
});

sample({
  clock: once(walletModel.$wallets),
  filter: (wallets) => wallets.length > 0 && wallets.every((wallet) => !wallet.isActive),
  fn: (wallets) => {
    const groups = walletSelectService.getWalletByGroups(wallets);

    return Object.values(groups).flat()[0].id;
  },
  target: walletModel.events.selectWallet,
});

export const walletSelectModel = {
  $filterQuery,
  $filteredWalletGroups,
  $walletBalance,

  events: {
    walletSelected: walletModel.events.selectWallet,
    queryChanged,
    clearData: $filterQuery.reinit,
    callbacksChanged: callbacksApi.callbacksChanged,
  },
};
