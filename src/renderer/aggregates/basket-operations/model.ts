import { createEffect, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type BasketTransaction } from '@/shared/core';

const $basketTransactions = createStore<BasketTransaction[]>([]);

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
  target: $basketTransactions,
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

export const basketOperations = {
  $list: readonly($basketTransactions),

  populate: populateFx,
  addTransactions: addTransactionsFx,
  updateTransactions: updateTransactionsFx,
  removeTransactions: removeTransactionsFx,
};
