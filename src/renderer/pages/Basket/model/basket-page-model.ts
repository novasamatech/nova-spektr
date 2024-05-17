import { combine, createEvent, createStore, restore, sample } from 'effector';

import { walletModel } from '@entities/wallet';
import { basketModel } from '@entities/basket';
import { includes } from '@shared/lib/utils';
import { BasketTransaction } from '@shared/core';
import { getTransactionTitle } from '../../Operations/common/utils';

const queryChanged = createEvent<string>();
const txSelected = createEvent<BasketTransaction['id']>();
const allSelected = createEvent();

const $selectedTxs = createStore<BasketTransaction['id'][]>([]);
const $query = restore(queryChanged, '');

const $basketTransactions = combine(
  {
    wallet: walletModel.$activeWallet,
    basket: basketModel.$basket,
    query: $query,
  },
  ({ wallet, basket, query }) => {
    return basket.filter(
      (tx) =>
        tx.initiatorWallet === wallet?.id &&
        (!query ||
          includes(tx.coreTx.address, query) ||
          includes(tx.coreTx.chainId, query) ||
          // TODO: Add search by translated name
          includes(getTransactionTitle(tx.coreTx), query)),
    );
  },
  { skipVoid: false },
);

sample({
  clock: txSelected,
  source: $selectedTxs,
  fn: (selectedTxs, id) => {
    if (selectedTxs.includes(id)) {
      return selectedTxs.filter((tx) => tx !== id);
    }

    return selectedTxs.concat(id);
  },
  target: $selectedTxs,
});

sample({
  clock: allSelected,
  source: {
    txs: $basketTransactions,
    selectedTxs: $selectedTxs,
  },
  fn: ({ txs, selectedTxs }) => (selectedTxs.length === txs.length ? [] : txs.map((tx) => tx.id)),
  target: $selectedTxs,
});

export const basketPageModel = {
  $basketTransactions,
  $selectedTxs,

  events: {
    txSelected,
    queryChanged,
    allSelected,
  },
};
