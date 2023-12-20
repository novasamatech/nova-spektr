import { createEvent, createEffect, createStore, sample } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import { HIDE_ZERO_BALANCES } from '../common/constants';
import { Account } from '@shared/core';
import { walletModel } from '@entities/wallet';

const assetsStarted = createEvent();
const queryChanged = createEvent<string>();
const activeShardsSet = createEvent<Account[]>();
const hideZeroBalancesChanged = createEvent<boolean>();

const $query = createStore<string>('');
const $activeShards = createStore<Account[]>([]);
const $hideZeroBalances = createStore<boolean>(true);

const getHideZeroBalancesFx = createEffect((): boolean => {
  return localStorageService.getFromStorage(HIDE_ZERO_BALANCES, true);
});

const saveHideZeroBalancesFx = createEffect((value: boolean): boolean => {
  return localStorageService.saveToStorage(HIDE_ZERO_BALANCES, value);
});

sample({
  clock: assetsStarted,
  target: getHideZeroBalancesFx,
});

sample({
  clock: [saveHideZeroBalancesFx.doneData, getHideZeroBalancesFx.doneData],
  target: $hideZeroBalances,
});

sample({
  clock: hideZeroBalancesChanged,
  target: saveHideZeroBalancesFx,
});

sample({
  clock: queryChanged,
  target: $query,
});

sample({
  clock: [activeShardsSet, walletModel.$activeAccounts],
  target: $activeShards,
});

export const assetsModel = {
  $query,
  $activeShards,
  $hideZeroBalances,
  events: {
    activeShardsSet,
    assetsStarted,
    queryChanged,
    hideZeroBalancesChanged,
  },
};
