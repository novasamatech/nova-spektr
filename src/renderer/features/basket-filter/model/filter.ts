import { combine, createEvent, restore } from 'effector';

import { walletModel } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { filterTx } from '../lib/utils';

import { type SelectedFilters } from './types';

const EmptySelectedFilters: SelectedFilters = {
  status: [],
  network: [],
  type: [],
};

const selectedOptionsChanged = createEvent<SelectedFilters>();

const $selectedOptions = restore(selectedOptionsChanged, EmptySelectedFilters);

const $basketTxs = combine(
  {
    wallet: walletModel.$activeWallet,
    basket: basketOperations.$list,
  },
  ({ wallet, basket }) => basket.filter((tx) => tx.initiatorWallet === wallet?.id).reverse(),
);

const $filteredTxs = combine(
  {
    basketTxs: $basketTxs,
    selectedOptions: $selectedOptions,
  },
  ({ basketTxs, selectedOptions }) => {
    return basketTxs.filter((tx) => filterTx(tx, [], selectedOptions));
  },
);

export const filter = {
  $selectedOptions,
  $basketTxs,
  $filteredTxs,

  selectedOptionsChanged,
  selectedOptionsReset: $selectedOptions.reinit,
};
