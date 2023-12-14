import { createStore, combine, createEvent, sample } from 'effector';
import { createGate } from 'effector-react';
import BigNumber from 'bignumber.js';

import { includes, getRoundedValue, totalAmount } from '@shared/lib/utils';
import { walletModel, walletUtils } from '@entities/wallet';
import { currencyModel, priceProviderModel } from '@entities/price';
import type { WalletFamily, Wallet, Balance, Chain, ChainId, AccountId, ID } from '@shared/core';
import { WalletType } from '@shared/core';

const walletIdSet = createEvent<ID>();
const walletIdCleared = createEvent();
const clearData = createEvent();
const queryChanged = createEvent<string>();

const PropsGate = createGate<{ balances: Balance[]; chains: Record<ChainId, Chain> }>();

const $walletId = createStore<ID | null>(null).reset(walletIdCleared);
const $filterQuery = createStore<string>('').reset(clearData);
const $isWalletChanged = createStore<boolean>(false).reset(clearData);

const $walletForDetails = combine(
  {
    wallets: walletModel.$wallets,
    walletId: $walletId,
  },
  ({ wallets, walletId }): Wallet | null => {
    if (!walletId) return null;

    return walletUtils.getWalletById(wallets, walletId) ?? null;
  },
);

const $filteredWalletGroups = combine(
  {
    wallets: walletModel.$wallets,
    query: $filterQuery,
  },
  ({ wallets, query }) => {
    return wallets.reduce<Record<WalletFamily, Wallet[]>>(
      (acc, wallet) => {
        let groupIndex: WalletFamily | undefined;

        if (walletUtils.isPolkadotVaultGroup(wallet)) groupIndex = WalletType.POLKADOT_VAULT;
        if (walletUtils.isMultisig(wallet)) groupIndex = WalletType.MULTISIG;
        if (walletUtils.isWatchOnly(wallet)) groupIndex = WalletType.WATCH_ONLY;
        if (walletUtils.isWalletConnect(wallet)) groupIndex = WalletType.WALLET_CONNECT;
        if (walletUtils.isNovaWallet(wallet)) groupIndex = WalletType.NOVA_WALLET;

        if (groupIndex && includes(wallet.name, query)) {
          acc[groupIndex].push(wallet);
        }

        return acc;
      },
      {
        [WalletType.POLKADOT_VAULT]: [],
        [WalletType.MULTISIG]: [],
        [WalletType.NOVA_WALLET]: [],
        [WalletType.WALLET_CONNECT]: [],
        [WalletType.WATCH_ONLY]: [],
      },
    );
  },
);

type WalletsBalances = Record<Wallet['id'], BigNumber>;
const $walletBalances = combine(
  {
    accounts: walletModel.$accounts,
    currency: currencyModel.$activeCurrency,
    prices: priceProviderModel.$assetsPrices,
    gate: PropsGate.state,
  },
  ({ accounts, currency, prices, gate }): WalletsBalances => {
    if (!currency?.coingeckoId || !prices || !gate.balances) return {};

    const accountsBalancesMap = gate.balances.reduce<Record<AccountId, BigNumber>>((acc, balance) => {
      const asset = gate.chains[balance.chainId]?.assets?.find((asset) => asset.assetId.toString() === balance.assetId);

      if (!asset?.priceId || !prices[asset.priceId]) return acc;

      const price = prices[asset.priceId][currency.coingeckoId];
      if (price) {
        const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        const newBalance = new BigNumber(fiatBalance);
        acc[balance.accountId] = acc[balance.accountId]?.plus(newBalance) || newBalance;
      }

      return acc;
    }, {});

    // skip repeated accounts and sum balances in a single array traversal
    const { result } = accounts.reduce(
      (acc, account) => {
        const { accountId, walletId } = account;
        const balance = accountsBalancesMap[accountId] || new BigNumber(0);

        if (!acc.temp[walletId]) {
          acc.temp[walletId] = { [accountId]: true };
          acc.result[walletId] = balance;
        } else if (!acc.temp[walletId][accountId]) {
          acc.temp[walletId][accountId] = true;
          acc.result[walletId].plus(balance);
        }

        return acc;
      },
      { temp: {} as Record<Wallet['id'], Record<AccountId, boolean>>, result: {} as WalletsBalances },
    );

    return result;
  },
);

sample({ clock: queryChanged, target: $filterQuery });

sample({ clock: walletIdSet, target: $walletId });

sample({
  clock: walletModel.events.walletSelected,
  source: walletModel.$activeWallet,
  fn: (wallet, walletId) => walletId !== wallet?.id,
  target: $isWalletChanged,
});

export const walletSelectModel = {
  $filteredWalletGroups,
  $walletBalances,
  $walletForDetails,
  $isWalletChanged,
  PropsGate,
  events: {
    clearData,
    queryChanged,
    walletIdSet,
    walletIdCleared,
  },
};
