import { createEffect, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type BasketTransaction } from '@/shared/core';

const $basketTransactions = createStore<BasketTransaction[]>([]);

const populateFx = createEffect((): Promise<BasketTransaction[]> => storageService.basketTransactions.readAll());

const addTransactionsFx = createEffect(
  async (transactions: BasketTransaction[]): Promise<BasketTransaction[] | undefined> => {
    return storageService.basketTransactions.createAll(transactions);
  },
);

const updateTransactionsFx = createEffect((transactions: BasketTransaction[]): Promise<number[] | undefined> => {
  return storageService.basketTransactions.updateAll(transactions);
});

const removeTransactionsFx = createEffect((transactions: BasketTransaction[]): Promise<number[] | undefined> => {
  return storageService.basketTransactions.deleteAll(transactions.map(t => t.id));
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
