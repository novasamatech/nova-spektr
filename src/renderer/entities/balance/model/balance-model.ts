import { createEffect, createEvent, createStore, sample } from 'effector';
import { throttle } from 'patronum';
import keyBy from 'lodash/keyBy';

import { AccountId, Balance } from '@shared/core';
import { useBalanceService, SAVE_TIMEOUT, BUFFER_DELAY } from '../lib';

const balanceService = useBalanceService();

const balancesUpdated = createEvent<Balance[]>();
const accountsBalancesRemoved = createEvent<AccountId[]>();

const $balances = createStore<Balance[]>([]);
const $balancesBuffer = createStore<Balance[]>([]);

const insertBalancesFx = createEffect(async (balances: Balance[]): Promise<void> => {
  await balanceService.insertBalances(balances);
});

const deleteAccountsBalancesFx = createEffect(async (accountIds: AccountId[]): Promise<void> => {
  try {
    await balanceService.deleteBalances(accountIds);
  } catch (e) {
    console.error(`Error while deleting wallet balances`, e);
  }
});

sample({
  clock: balancesUpdated,
  source: $balancesBuffer,
  fn: (balances, newBalances) => {
    const newBalancesMap = keyBy(newBalances, (b) => `${b.chainId}_${b.assetId}_${b.accountId}`);

    const updatedBalances = balances.map((balance) => {
      const { chainId, assetId, accountId } = balance;
      const newBalance = newBalancesMap[`${chainId}_${assetId}_${accountId}`];

      if (newBalance) {
        balance.free = newBalance?.free || balance.free;
        balance.frozen = newBalance?.frozen || balance.frozen;
        balance.reserved = newBalance?.reserved || balance.reserved;
        balance.locked = newBalance?.locked || balance.locked;

        delete newBalancesMap[`${chainId}_${assetId}_${accountId}`];
      }

      return balance;
    });

    return updatedBalances.concat(Object.values(newBalancesMap));
  },
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
  clock: accountsBalancesRemoved,
  target: deleteAccountsBalancesFx,
});

export const balanceModel = {
  $balances,
  $balancesBuffer,
  events: {
    balancesUpdated,
    accountsBalancesRemoved,
  },
};
