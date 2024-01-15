import { createStore, combine, createEvent, sample, createApi, attach, createEffect } from 'effector';
import BigNumber from 'bignumber.js';
import { once, previous } from 'patronum';

import { includes, getRoundedValue, totalAmount, dictionary } from '@shared/lib/utils';
import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { currencyModel, priceProviderModel } from '@entities/price';
import type { WalletFamily, Wallet, ID } from '@shared/core';
import { WalletType } from '@shared/core';
import { networkModel } from '@entities/network';
import { balanceModel } from '@entities/balance';
import { storageService } from '@shared/api/storage';

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
    prevWallets: previous(walletModel.$wallets, []),
    wallets: walletModel.$wallets,
  },
  ({ prevWallets, wallets }) => {
    return prevWallets.length > wallets.length;
  },
);

const $isWalletsAdded = combine(
  {
    prevWallets: previous(walletModel.$wallets, []),
    wallets: walletModel.$wallets,
  },
  ({ prevWallets, wallets }) => {
    return wallets.length > prevWallets.length;
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
    const accumulator: Record<WalletFamily, Wallet[]> = {
      [WalletType.POLKADOT_VAULT]: [],
      [WalletType.MULTISIG]: [],
      [WalletType.NOVA_WALLET]: [],
      [WalletType.WALLET_CONNECT]: [],
      [WalletType.WATCH_ONLY]: [],
      [WalletType.PROXIED]: [],
    };

    return wallets.reduce<Record<WalletFamily, Wallet[]>>((acc, wallet) => {
      let groupIndex: WalletFamily | undefined;

      if (walletUtils.isPolkadotVaultGroup(wallet)) groupIndex = WalletType.POLKADOT_VAULT;
      if (walletUtils.isMultisig(wallet)) groupIndex = WalletType.MULTISIG;
      if (walletUtils.isWatchOnly(wallet)) groupIndex = WalletType.WATCH_ONLY;
      if (walletUtils.isWalletConnect(wallet)) groupIndex = WalletType.WALLET_CONNECT;
      if (walletUtils.isNovaWallet(wallet)) groupIndex = WalletType.NOVA_WALLET;
      if (walletUtils.isProxied(wallet)) groupIndex = WalletType.PROXIED;

      if (groupIndex && includes(wallet.name, query)) {
        acc[groupIndex].push(wallet);
      }

      return acc;
    }, accumulator);
  },
);

const $walletBalance = combine(
  {
    wallet: walletModel.$activeWallet,
    accounts: walletModel.$activeAccounts,
    chains: networkModel.$chains,
    balances: balanceModel.$balances,
    currency: currencyModel.$activeCurrency,
    prices: priceProviderModel.$assetsPrices,
  },
  (params): BigNumber => {
    const { wallet, accounts, chains, balances, prices, currency } = params;

    if (!wallet || !prices || !balances || !currency?.coingeckoId) return new BigNumber(0);

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const accountMap = dictionary(accounts, 'accountId');

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

type SelectParams = {
  prevId?: ID;
  nextId: ID;
};
const walletSelectedFx = createEffect(async ({ prevId, nextId }: SelectParams): Promise<ID | undefined> => {
  if (!prevId) {
    return storageService.wallets.update(nextId, { isActive: true });
  }

  // TODO: consider using Dexie transaction() | Task --> https://app.clickup.com/t/8692uyemn
  const [, nextWallet] = await Promise.all([
    storageService.wallets.update(prevId, { isActive: false }),
    storageService.wallets.update(nextId, { isActive: true }),
  ]);

  return nextWallet ? nextId : undefined;
});

sample({ clock: queryChanged, target: $filterQuery });

sample({ clock: walletIdSet, target: $walletId });

sample({
  clock: once(walletModel.$wallets),
  filter: (wallets) => wallets.length > 0,
  fn: (wallets) => {
    const match = wallets.find((wallet) => wallet.isActive) || wallets[0];

    return { nextId: match.id };
  },
  target: walletSelectedFx,
});

sample({
  clock: walletSelected,
  source: walletModel.$activeWallet,
  fn: (wallet, nextId) => ({ prevId: wallet?.id, nextId }),
  target: walletSelectedFx,
});

sample({
  clock: $isWalletsRemoved,
  source: walletModel.$wallets,
  filter: (wallets, isWalletsRemoved) => {
    if (!isWalletsRemoved || wallets.length === 0) return false;

    return wallets.every((wallet) => !wallet.isActive);
  },
  fn: (wallets) => ({ nextId: wallets[0].id }),
  target: walletSelectedFx,
});

sample({
  clock: $isWalletsAdded,
  source: walletModel.$wallets,
  filter: (wallets, isWalletsAdded) => {
    return isWalletsAdded && !walletUtils.isProxied(wallets[wallets.length - 1]);
  },
  fn: (wallets) => ({ nextId: wallets[wallets.length - 1].id }),
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
    return wallets.map((wallet) => {
      const isCurrent = wallet.isActive;
      const isSelected = wallet.id === nextId;

      return isCurrent || isSelected ? { ...wallet, isActive: wallet.id === nextId } : wallet;
    });
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
