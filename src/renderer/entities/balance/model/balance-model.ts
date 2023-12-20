import { createEffect, createEvent, createStore, sample } from 'effector';
import { throttle } from 'patronum';
import { keyBy } from 'lodash';

import { Balance } from '@shared/core';
import { useBalanceService, SAVE_TIMEOUT } from '../lib';

const balanceService = useBalanceService();

const balancesUpdated = createEvent<Balance[]>();

const $balances = createStore<Balance[]>([]);

const insertBalancesFx = createEffect(async (balances: Balance[]): Promise<void> => {
  await balanceService.insertBalances(balances);
});

throttle({
  source: $balances,
  timeout: SAVE_TIMEOUT,
  target: insertBalancesFx,
});

sample({
  clock: balancesUpdated,
  source: $balances,
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
  target: $balances,
});

export const balanceModel = {
  $balances,
  events: {
    balancesUpdated,
  },
};
