import { combine } from 'effector';

import { balanceService } from '@/shared/api/balances';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { walletSelect } from '@/aggregates/wallet-select';

const $activeWalletBalance = combine(
  {
    wallet: walletSelect.$selectedWallet,
    chains: networkModel.$chains,
    balances: balanceModel.$balances,
    currency: currencyModel.$activeCurrency,
    prices: priceProviderModel.$assetsPrices,
  },
  params => balanceService.calculateWalletBalance(params),
);

export const walletFiatBalanceModel = {
  $activeWalletBalance,
};
