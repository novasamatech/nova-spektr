import { default as BigNumber } from 'bignumber.js';
import { combine } from 'effector';

import { dictionary, getRoundedValue, nullable, totalAmount } from '@/shared/lib/utils';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

const $activeWalletBalance = combine(
  {
    wallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
    balances: balanceModel.$balances,
    currency: currencyModel.$activeCurrency,
    prices: priceProviderModel.$assetsPrices,
  },
  params => {
    const { wallet, chains, balances, prices, currency } = params;

    if (nullable(currency?.coingeckoId) || nullable(wallet) || nullable(prices) || balances.length === 0) {
      return new BigNumber(0);
    }

    const isPolkadotVault = walletUtils.isPolkadotVault(wallet);

    const accountMap = dictionary(wallet.accounts, 'accountId');

    return balances.reduce((acc, balance) => {
      const account = accountMap[balance.accountId];
      const chain = chains[balance.chainId];
      if (nullable(account) || nullable(chain)) return acc;
      if (accountUtils.isVaultBaseAccount(account) && isPolkadotVault) return acc;

      const asset = chain.assets.find(asset => asset.assetId.toString() === balance.assetId);
      if (nullable(asset?.priceId)) return acc;
      const pricesMap = prices[asset.priceId];
      if (nullable(pricesMap)) return acc;
      const price = pricesMap[currency.coingeckoId];
      if (nullable(price)) return acc;

      const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);

      return acc.plus(new BigNumber(fiatBalance));
    }, new BigNumber(0));
  },
);

export const walletFiatBalanceModel = {
  $activeWalletBalance,
};
