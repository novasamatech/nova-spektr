import { combine, createEvent, restore } from 'effector';

import { basketModel } from '@entities/basket';
import { walletModel } from '@entities/wallet';
import { SelectedFilters } from '../common/types';
import { filterTx } from '../lib/utils';

const EmptySelectedFilters: SelectedFilters = {
  status: [],
  network: [],
  type: [],
};

const selectedOptionsChanged = createEvent<SelectedFilters>();
const invalidTxsSet = createEvent<number[]>();

const $selectedOptions = restore(selectedOptionsChanged, EmptySelectedFilters);
const $invalidTxs = restore(invalidTxsSet, []);

const $basketTxs = combine(
  {
    wallet: walletModel.$activeWallet,
    basket: basketModel.$basket,
  },
  ({ wallet, basket }) => basket.filter((tx) => tx.initiatorWallet === wallet?.id).reverse(),
);

const $filteredTxs = combine(
  {
    basketTxs: $basketTxs,
    selectedOptions: $selectedOptions,
    invalidTxs: $invalidTxs,
  },
  ({ basketTxs, selectedOptions, invalidTxs }) => {
    return basketTxs.filter((tx) => filterTx(tx, invalidTxs, selectedOptions));
  },
);

export const basketFilterModel = {
  $selectedOptions,
  $basketTxs,
  $filteredTxs,

  events: {
    selectedOptionsChanged,
    selectedOptionsReset: $selectedOptions.reinit,
    invalidTxsSet,
  },
};
