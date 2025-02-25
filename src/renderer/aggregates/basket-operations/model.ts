import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { uniq } from 'lodash';
import { readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type BasketTransaction, type ID } from '@/shared/core';
import { walletSelect } from '@/aggregates/wallet-select';
// eslint-disable-next-line boundaries/element-types
import { ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';

// list

const $list = createStore<BasketTransaction[]>([]);

const populateFx = createEffect(() => storageService.basketTransactions.readAll());

const addTransactionsFx = createEffect(
  async (transactions: Omit<BasketTransaction, 'id'>[]): Promise<BasketTransaction[]> => {
    return storageService.basketTransactions.createAll(transactions).then(result => result ?? []);
  },
);

const updateTransactionsFx = createEffect((transactions: BasketTransaction[]): Promise<number[]> => {
  return storageService.basketTransactions.updateAll(transactions).then(result => result ?? []);
});

const removeTransactionsFx = createEffect((transactions: BasketTransaction[]): Promise<number[] | undefined> => {
  return storageService.basketTransactions.deleteAll(transactions.map(t => t.id)).then(result => result ?? []);
});

sample({
  clock: populateFx.doneData,
  target: $list,
});

sample({
  clock: addTransactionsFx,
  target: populateFx,
});

sample({
  clock: updateTransactionsFx,
  target: populateFx,
});

sample({
  clock: removeTransactionsFx,
  target: populateFx,
});

// select

const $selectedIds = createStore<ID[]>([]);
const $selected = combine($list, $selectedIds, (list, ids) => {
  return list.filter(record => ids.includes(record.id));
});

const select = createEvent<ID[]>();
const toggle = createEvent<ID>();
const deselect = createEvent<ID[]>();

sample({
  clock: select,
  source: $selectedIds,
  fn: (selected, toAdd) => uniq(selected.concat(toAdd)),
  target: $selectedIds,
});

sample({
  clock: toggle,
  source: $selectedIds,
  fn: (selected, id) => (selected.includes(id) ? selected.filter(x => x !== id) : uniq(selected.concat(id))),
  target: $selectedIds,
});

sample({
  clock: deselect,
  source: $selectedIds,
  fn: (selected, toRemove) => selected.filter(s => !toRemove.includes(s)),
  target: $selectedIds,
});

// sync

sample({
  clock: walletSelect.$selectedAccounts,
  source: $selectedIds,
  target: deselect,
});

sample({
  clock: submitModel.output.formSubmitted,
  source: $list,
  fn: (transactions, results) => {
    return transactions.filter(tx =>
      results.some(result => result.id === tx.id && result.result === ExtrinsicResult.SUCCESS),
    );
  },
  target: removeTransactionsFx,
});

export const basketOperations = {
  $list: readonly($list),
  $selected: readonly($selected),

  populate: populateFx,
  addTransactions: addTransactionsFx,
  updateTransactions: updateTransactionsFx,
  removeTransactions: removeTransactionsFx,

  select,
  toggle,
  deselect,
};
