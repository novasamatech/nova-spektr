import { default as BigNumber } from 'bignumber.js';
import { combine, createEvent, restore, sample } from 'effector';

import { balanceService } from '@/shared/api/balances';
import { series } from '@/shared/effector';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { balanceSubModel } from '@/features/assets-balances';

export type Callbacks = {
  onClose: () => void;
};

const changeQuery = createEvent<string>();

const $query = restore(changeQuery, '');

const fetchWallets = createEvent();

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

sample({
  clock: fetchWallets,
  source: walletModel.$allWallets,
  target: series(balanceSubModel.fetchWallet),
});

export const walletList = {
  $query,
  $walletBalance,

  changeQuery,
  fetchWallets,
};
