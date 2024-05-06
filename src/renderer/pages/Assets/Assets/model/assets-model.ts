import { createEvent, createEffect, createStore, sample, combine } from 'effector';

import { localStorageService } from '@shared/api/local-storage';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
import { Account, Wallet } from '@shared/core';
import { HIDE_ZERO_BALANCES } from '../common/constants';

const assetsStarted = createEvent();
const queryChanged = createEvent<string>();
const activeShardsSet = createEvent<Account[]>();
const hideZeroBalancesChanged = createEvent<boolean>();

const $query = createStore<string>('');
const $activeShards = createStore<Account[]>([]);
const $hideZeroBalances = createStore<boolean>(false);

const getHideZeroBalancesFx = createEffect((): boolean => {
  return localStorageService.getFromStorage(HIDE_ZERO_BALANCES, false);
});

const saveHideZeroBalancesFx = createEffect((value: boolean): boolean => {
  return localStorageService.saveToStorage(HIDE_ZERO_BALANCES, value);
});

const $accounts = combine(walletModel.$activeWallet, (wallet) => {
  if (!wallet) return [];

  return wallet.accounts.filter((account) => accountUtils.isNonBaseVaultAccount(account, wallet));
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
  target: $hideZeroBalances,
});

sample({
  clock: queryChanged,
  target: $query,
});

sample({
  clock: activeShardsSet,
  source: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet, accounts) => {
    if (!walletUtils.isPolkadotVault(wallet)) return accounts;

    return accounts.filter((account) => !accountUtils.isBaseAccount(account));
  },
  target: $activeShards,
});

sample({
  clock: walletModel.$activeWallet,
  filter: (wallet: Wallet | undefined): wallet is Wallet => Boolean(wallet),
  fn: (wallet) => {
    if (!walletUtils.isPolkadotVault(wallet)) return wallet.accounts;

    return wallet.accounts.filter((account) => !accountUtils.isBaseAccount(account));
  },
  target: $activeShards,
});

export const assetsModel = {
  $query,
  $accounts,
  $activeShards,
  $hideZeroBalances,
  events: {
    assetsStarted,
    activeShardsSet,
    queryChanged,
    hideZeroBalancesChanged,
  },
};
