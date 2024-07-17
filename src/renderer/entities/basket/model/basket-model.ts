import { createEffect, createEvent, createStore, sample } from 'effector';

import { type BasketTransaction } from '@shared/core';
import { storageService } from '@shared/api/storage';

const basketStarted = createEvent();
const transactionsCreated = createEvent<BasketTransaction[]>();
const transactionsUpdated = createEvent<BasketTransaction[]>();
const transactionsRemoved = createEvent<BasketTransaction[]>();

const $basket = createStore<BasketTransaction[]>([]);

const populateBasketFx = createEffect((): Promise<BasketTransaction[]> => storageService.basketTransactions.readAll());

const addBasketTxsFx = createEffect(
  async (transactions: BasketTransaction[]): Promise<BasketTransaction[] | undefined> => {
    return storageService.basketTransactions.createAll(transactions);
  },
);

const updateBasketTxsFx = createEffect((transactions: BasketTransaction[]): Promise<number[] | undefined> => {
  return storageService.basketTransactions.updateAll(transactions);
});

const removeBasketTxsFx = createEffect((transactions: BasketTransaction[]): Promise<number[] | undefined> => {
  return storageService.basketTransactions.deleteAll(transactions.map((t) => t.id));
});

sample({
  clock: basketStarted,
  target: populateBasketFx,
});

sample({
  clock: populateBasketFx.doneData,
  target: $basket,
});

sample({
  clock: transactionsCreated,
  target: addBasketTxsFx,
});

sample({
  clock: addBasketTxsFx.doneData,
  source: $basket,
  filter: (_, transactions) => Boolean(transactions),
  fn: (basket, transactions) => basket.concat(transactions!),
  target: $basket,
});

sample({
  clock: transactionsRemoved,
  target: removeBasketTxsFx,
});

sample({
  clock: transactionsUpdated,
  target: updateBasketTxsFx,
});

sample({
  clock: updateBasketTxsFx.done,
  target: populateBasketFx,
});

sample({
  clock: removeBasketTxsFx.doneData,
  source: $basket,
  filter: (_, transactionIds) => Boolean(transactionIds),
  fn: (basket, transactionIds) => basket.filter((t) => !transactionIds!.includes(t.id)),
  target: $basket,
});

export const basketModel = {
  $basket,

  events: {
    basketStarted,
    transactionsCreated,
    transactionsUpdated,
    transactionsRemoved,
  },
};
