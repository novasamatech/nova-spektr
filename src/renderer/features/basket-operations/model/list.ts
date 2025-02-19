import { combine, sample } from 'effector';

import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { filterTx } from '../service/filter';

import { basketOperationsFeature } from './feature';
import { filter } from './filter';

const $all = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    basket: basketOperations.$list,
  },
  ({ accounts, basket }) => {
    return basket.filter(tx => accounts.find(a => a.accountId === tx.initiatorAccountId)).reverse();
  },
);

const $filtered = combine(
  {
    all: $all,
    selectedOptions: filter.$selectedOptions,
  },
  ({ all, selectedOptions }) => {
    return all.filter(tx => filterTx(tx, [], selectedOptions));
  },
);

sample({
  clock: basketOperationsFeature.running,
  target: basketOperations.populate,
});

export const list = {
  $all,
  $filtered,
};
