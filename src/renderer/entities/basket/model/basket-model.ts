import { createEffect, createEvent, createStore, sample } from 'effector';

import { BasketTransaction } from '@shared/core';
import { storageService } from '@shared/api/storage';

const transactionsCreated = createEvent<BasketTransaction[]>();

const basket = createStore<BasketTransaction[]>([]);

const createTxsFx = createEffect(
  async (transactions: BasketTransaction[]): Promise<BasketTransaction[] | undefined> => {
    return storageService.basketTransactions.createAll(transactions);
  },
);

sample({
  clock: transactionsCreated,
  target: createTxsFx,
});

sample({
  clock: createTxsFx.doneData,
  source: basket,
  filter: (_, transactions) => Boolean(transactions),
  fn: (basket, transactions) => basket.concat(transactions as BasketTransaction[]),
  target: basket,
});

export const basketModel = {
  basket,

  events: {
    transactionsCreated,
  },
};
