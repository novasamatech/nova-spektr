import { createStore, combine, createEvent, forward } from 'effector';
import { createGate } from 'effector-react';
import BigNumber from 'bignumber.js';

import { includes, getRoundedValue, totalAmount } from '@renderer/shared/lib/utils';
import { walletModel, walletUtils } from '@renderer/entities/wallet';
import type { WalletFamily, Wallet, Balance, Chain, ChainId, AccountId } from '@renderer/shared/core';
import { WalletType } from '@renderer/shared/core';
import { currencyModel, priceProviderModel } from '@renderer/entities/price';

const PropsGate = createGate<{ balances: Balance[]; chains: Record<ChainId, Chain> }>();

const $filterQuery = createStore<string>('');

const $filteredWalletGroups = combine(walletModel.$wallets, $filterQuery, (wallets, query) => {
  return wallets.reduce<Record<WalletFamily, Wallet[]>>(
    (acc, wallet) => {
      let groupIndex: WalletFamily | undefined;
      if (walletUtils.isPolkadotVault(wallet)) groupIndex = WalletType.POLKADOT_VAULT;
      if (walletUtils.isMultisig(wallet)) groupIndex = WalletType.MULTISIG;
      if (walletUtils.isWatchOnly(wallet)) groupIndex = WalletType.WATCH_ONLY;
      if (groupIndex && includes(wallet.name, query)) {
        acc[groupIndex].push(wallet);
      }

      return acc;
    },
    {
      [WalletType.POLKADOT_VAULT]: [],
      [WalletType.MULTISIG]: [],
      [WalletType.WATCH_ONLY]: [],
    },
  );
});

type WalletsBalances = Record<Wallet['id'], BigNumber>;
const $walletBalances = combine(
  walletModel.$accounts,
  currencyModel.$activeCurrency,
  priceProviderModel.$assetsPrices,
  PropsGate.state,
  (...args): WalletsBalances => {
    const [accounts, currency, prices, { balances, chains }] = args;

    if (!currency?.coingeckoId || !prices || !balances) return {};

    const accountsBalancesMap = balances.reduce<Record<AccountId, BigNumber>>((acc, balance) => {
      const asset = chains[balance.chainId]?.assets?.find((asset) => asset.assetId.toString() === balance.assetId);

      if (!asset?.priceId || !prices[asset.priceId]) return acc;

      const price = prices[asset.priceId][currency.coingeckoId];

      if (price) {
        const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        const newBalance = new BigNumber(fiatBalance);
        acc[balance.accountId] = acc[balance.accountId]?.plus(newBalance) || newBalance;
      }

      return acc;
    }, {});

    const walletsBalancesMap = accounts.reduce<Record<Wallet['id'], { [key: AccountId]: BigNumber }>>(
      (acc, account) => {
        const balance = accountsBalancesMap[account.accountId] || new BigNumber(0);

        if (acc[account.walletId]) {
          acc[account.walletId][account.accountId] = balance;
        } else {
          acc[account.walletId] = { [account.accountId]: balance };
        }

        return acc;
      },
      {},
    );

    return Object.entries(walletsBalancesMap).reduce<WalletsBalances>((acc, [walletId, balancesMap]) => {
      acc[Number(walletId)] = Object.values(balancesMap).reduce((sum, balance) => sum.plus(balance), new BigNumber(0));

      return acc;
    }, {});
  },
);

const queryChanged = createEvent<string>();

forward({ from: queryChanged, to: $filterQuery });

export const walletSelectModel = {
  $filteredWalletGroups,
  $walletBalances,
  PropsGate,
  events: {
    queryChanged,
  },
};
