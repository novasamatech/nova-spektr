import { type BigNumber } from 'bignumber.js';
import { combine, createEvent, sample } from 'effector';

import { balanceService } from '@/shared/api/balances';
import { series } from '@/shared/effector';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { balanceSubModel } from '@/features/assets-balances';

import { hiddenWalletsModel } from './hidden-wallets';

const loadBalances = createEvent();

sample({
  clock: loadBalances,
  source: hiddenWalletsModel.$hiddenWallets,
  fn: (hiddenWallets) => hiddenWallets,
  target: series(balanceSubModel.fetchWallet),
});

const $balances = combine(
  {
    wallets: hiddenWalletsModel.$hiddenWallets,
    chains: networkModel.$chains,
    balances: balanceModel.$balanceMap,
    currency: currencySelect.$activeCurrency,
    prices: currencySelect.$assetsPrices,
  },
  ({ wallets, chains, balances, currency, prices }) => {
    return wallets.reduce<Record<string, BigNumber>>((acc, wallet) => {
      acc[wallet.id] = balanceService.calculateWalletBalance({
        accounts: wallet.accounts,
        chains,
        balances,
        currency,
        prices,
      });
      return acc;
    }, {});
  },
);

export const hiddenWalletsBalancesModel = {
  $balances,
  loadBalances,
};
