import { default as BigNumber } from 'bignumber.js';
import { combine, sample } from 'effector';

import { dictionary, getRoundedValue, nonNullable, totalAmount } from '@/shared/lib/utils';
import { accountService, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { balanceSubModel } from '@/features/assets-balances';

import { walletDetailsModel } from './wallet-details-model';

const $isLoading = combine(
  {
    wallet: walletDetailsModel.$wallet,
    balances: balanceModel.$balances,
    accounts: accounts.$list,
  },
  ({ wallet, balances, accounts }) => {
    if (!wallet || !balances || !accounts) return true;

    const walletAccounts = accountService.filterAccountsByWallet(accounts, wallet.id);

    return !walletAccounts.some(account => balances.some(balance => balance.accountId === account.accountId));
  },
);

sample({
  clock: walletDetailsModel.$wallet.updates.filter({ fn: nonNullable }),
  target: balanceSubModel.fetchWallet,
});

const $walletBalance = combine(
  {
    wallet: walletDetailsModel.$wallet,
    chains: networkModel.$chains,
    balances: balanceModel.$balanceMap,
    currency: currencySelect.$activeCurrency,
    prices: currencySelect.$assetsPrices,
    accounts: accounts.$list,
  },
  params => {
    const { wallet, chains, balances, prices, currency, accounts } = params;

    if (!wallet || !prices || !currency?.coingeckoId) return new BigNumber(0);

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
    const accountMap = dictionary(accountService.filterAccountsByWallet(accounts, wallet.id), 'accountId');

    return Object.values(balances).reduce<BigNumber>((acc, balance) => {
      const account = accountMap[balance.accountId];
      if (!account) return acc;
      if (accountUtils.isVaultBaseAccount(account) && isPolkadotVault) return acc;

      const asset = chains[balance.chainId]?.assets?.find(asset => asset.assetId === balance.assetId);

      if (!asset?.priceId || !prices[asset.priceId]) return acc;

      const price = prices[asset.priceId]![currency.coingeckoId];
      if (price) {
        const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        acc = acc.plus(new BigNumber(fiatBalance));
      }

      return acc;
    }, new BigNumber(0));
  },
);

export const walletBalanceModel = {
  $walletBalance,
  $isLoading,
};
