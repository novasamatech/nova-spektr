import { default as BigNumber } from 'bignumber.js';
import { combine, createEvent, restore, sample } from 'effector';

import { balanceService } from '@/shared/api/balances';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { walletSelect } from '@/aggregates/wallet-select';

export type Callbacks = {
  onClose: () => void;
};

const changeQuery = createEvent<string>();

const $query = restore(changeQuery, '');

const $walletBalance = combine(
  {
    wallet: walletSelect.$selectedWallet,
    chains: networkModel.$chains,
    balances: balanceModel.$balances,
    currency: currencyModel.$activeCurrency,
    prices: priceProviderModel.$assetsPrices,
  },
  params => {
    const { wallet, chains, balances, prices, currency } = params;

    if (!wallet || !prices || !balances || !currency?.coingeckoId) return new BigNumber(0);

    return balanceService.calculateWalletBalance({
      wallet,
      chains,
      balances,
      currency,
      prices,
    });
  },
);

sample({
  clock: changeQuery,
  target: $query,
});

export const walletList = {
  $query,
  $walletBalance,

  changeQuery,
};
