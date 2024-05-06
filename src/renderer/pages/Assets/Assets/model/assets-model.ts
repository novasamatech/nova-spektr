import { createEvent, sample, createStore } from 'effector';

import type { Account } from '@shared/core';
import { walletModel, accountUtils, walletUtils } from '@entities/wallet';
<<<<<<< HEAD
=======
import { Account, Wallet } from '@shared/core';
import { HIDE_ZERO_BALANCES } from '../common/constants';
>>>>>>> 9c3b8700cc06055d24898891a2c340649c1738e8

const activeShardsSet = createEvent<Account[]>();

const $activeShards = createStore<Account[]>([]);
<<<<<<< HEAD
=======
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
>>>>>>> 9c3b8700cc06055d24898891a2c340649c1738e8

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
  $activeShards,
  events: {
    activeShardsSet,
  },
};
