import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import { type BasketTransaction } from '@/shared/core';
import { removeFromCollection } from '@/shared/lib/utils';

const flow = createGate<BasketTransaction[]>();

const selectTx = createEvent<BasketTransaction>();
const selectTxs = createEvent<BasketTransaction[]>();
const filterTxs = createEvent<BasketTransaction[]>();

const $selectedTxs = createStore<BasketTransaction[]>([]);

sample({
  clock: selectTx,
  source: $selectedTxs,
  fn: (selectedTxs, tx) => (selectedTxs.includes(tx) ? removeFromCollection(selectedTxs, tx) : [...selectedTxs, tx]),
  target: $selectedTxs,
});

sample({
  clock: selectTxs,
  source: $selectedTxs,
  fn: (selectedTxs, txs) => (selectedTxs.length > 0 ? [] : [...txs]),
  target: $selectedTxs,
});

sample({
  clock: flow.state,
  source: $selectedTxs,
  fn: (selectedTxs, txs) => selectedTxs.filter((s) => txs.some((tx) => tx.id === s.id)),
  target: $selectedTxs,
});

export const selectOperations = {
  flow,

  $selectedTxs,

  selectTx,
  selectTxs,
  filterTxs,
};
