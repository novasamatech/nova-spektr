import { createEvent, createEffect, createStore, sample } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { Account } from '@shared/core';
import { HIDE_ZERO_BALANCES } from '../common/constants';

const assetsStarted = createEvent();
const queryChanged = createEvent<string>();
const activeShardsSet = createEvent<Account[]>();
const hideZeroBalancesChanged = createEvent<boolean>();

const $query = createStore<string>('');
const $activeShards = createStore<Account[]>([]);
const $hideZeroBalances = createStore<boolean>(false);

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
  source: walletModel.$activeWallet,
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => {
      return !accountUtils.isBaseAccount(account) && account;
    });
  },
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
