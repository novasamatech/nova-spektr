import { createStore, combine, createEvent, sample } from 'effector';
import BigNumber from 'bignumber.js';

import { includes, getRoundedValue, totalAmount } from '@shared/lib/utils';
import { walletModel, walletUtils, accountUtils } from '@entities/wallet';
import { currencyModel, priceProviderModel } from '@entities/price';
import type { WalletFamily, Wallet, AccountId, ID, ChainId } from '@shared/core';
import { WalletType } from '@shared/core';
import { networkModel } from '@entities/network';
import { balanceModel } from '@entities/balance';

const walletIdSet = createEvent<ID>();
const walletIdCleared = createEvent();
const clearData = createEvent();
const queryChanged = createEvent<string>();

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

    const accountsBalancesMap = balances.reduce<Record<AccountId, { [chainId: ChainId]: BigNumber }>>(
      (acc, balance) => {
        const asset = chains[balance.chainId]?.assets?.find((asset) => asset.assetId.toString() === balance.assetId);

        if (!asset?.priceId || !prices[asset.priceId]) return acc;

        const price = prices[asset.priceId][currency.coingeckoId];
        if (price) {
          const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
          const newBalance = new BigNumber(fiatBalance);

          const existingAccount = acc[balance.accountId];
          if (existingAccount) {
            existingAccount[balance.chainId] = existingAccount[balance.chainId]?.plus(newBalance) || newBalance;
          } else {
            acc[balance.accountId] = { [balance.chainId]: newBalance };
          }
        }

        return acc;
      },
      {},
    );

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);

    return accounts.reduce((acc, account) => {
      const accountMap = accountsBalancesMap[account.accountId];
      const skipBaseAccount = isPolkadotVault && accountUtils.isBaseAccount(account);

      if (skipBaseAccount || !accountMap) return acc;

      if (accountUtils.isBaseAccount(account)) {
        const totalBalance =
          Object.values(accountMap).reduce((acc, b) => {
            return acc.plus(b);
          }, new BigNumber(0)) || new BigNumber(0);

        return acc.plus(totalBalance);
      }

      return acc.plus(accountMap[account.chainId] || new BigNumber(0));
    }, new BigNumber(0));
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
  $walletBalance,
  $walletForDetails,
  $isWalletChanged,
  events: {
    clearData,
    queryChanged,
    walletIdSet,
    walletIdCleared,
  },
};
