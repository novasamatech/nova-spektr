import { createEffect, createEvent, createStore, sample } from 'effector';
import { throttle } from 'patronum';

import { Balance, ID } from '@shared/core';
import { SAVE_TIMEOUT, BUFFER_DELAY } from '../lib/constants';
import { storageService } from '@shared/api/storage';
import { balanceUtils } from '../lib/balance-utils';

const balancesSet = createEvent<Balance[]>();
const balancesUpdated = createEvent<Balance[]>();
const balancesRemoved = createEvent<ID[]>();

const $balances = createStore<Balance[]>([]);
const $balancesBuffer = createStore<Balance[]>([]);

const insertBalancesFx = createEffect(async (balances: Balance[]): Promise<void> => {
  await storageService.balances.insertAll(balances);
});

const removeBalancesFx = createEffect(async (ids: ID[]): Promise<void> => {
  await storageService.balances.deleteAll(ids);
});

sample({
  clock: balancesSet,
  target: $balancesBuffer,
});

sample({
  clock: balancesUpdated,
  source: $balancesBuffer,
  filter: (_, newBalances) => newBalances.length > 0,
  fn: balanceUtils.getMergeBalances,
  target: $balancesBuffer,
});

throttle({
  source: $balancesBuffer,
  timeout: SAVE_TIMEOUT,
  target: insertBalancesFx,
});

throttle({
  source: $balancesBuffer,
  timeout: BUFFER_DELAY,
  target: $balances,
});

sample({
  clock: balancesRemoved,
  target: removeBalancesFx,
});

export const balanceModel = {
  $balances,
  events: {
    balancesSet,
    balancesUpdated,
    balancesRemoved,
  },
};
