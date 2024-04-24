import { createEvent, createEffect, sample } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import type { Account } from '@shared/core';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { assetsModel } from '@entities/asset';
import { HIDE_ZERO_BALANCES } from '../common/constants';

const assetsStarted = createEvent();
const hideZeroBalancesChanged = createEvent<boolean>();
const activeShardsSet = createEvent<Account[]>();

const getHideZeroBalancesFx = createEffect((): boolean => {
  return localStorageService.getFromStorage(HIDE_ZERO_BALANCES, false);
});

const saveHideZeroBalancesFx = createEffect((value: boolean): boolean => {
  return localStorageService.saveToStorage(HIDE_ZERO_BALANCES, value);
});

sample({
  clock: assetsStarted,
  target: getHideZeroBalancesFx,
});

sample({
  clock: hideZeroBalancesChanged,
  target: saveHideZeroBalancesFx,
});

sample({
  clock: [saveHideZeroBalancesFx.doneData, getHideZeroBalancesFx.doneData],
  target: assetsModel.$hideZeroBalances,
});

sample({
  clock: [activeShardsSet, walletModel.$activeAccounts],
  source: walletModel.$activeWallet,
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => {
      return account && !accountUtils.isBaseAccount(account);
    });
  },
  target: assetsModel.$activeShards,
});

export const assetsViewModel = {
  events: {
    assetsStarted,
    activeShardsSet,
    hideZeroBalancesChanged,
  },
};
