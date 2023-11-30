import { createEffect, createEvent, createStore, forward, sample } from 'effector';
import { throttle } from 'patronum';

import { Balance, kernelModel } from '@shared/core';
import { useBalanceService } from '../lib/balanceService';

const balanceService = useBalanceService();

const balanceUpdated = createEvent<Balance>();

const $balances = createStore<Balance[]>([]);

const insertBalancesFx = createEffect(async (balances: Balance[]): Promise<void> => {
  await balanceService.insertBalances(balances);
});

const populateBalancesFx = createEffect(async (): Promise<Balance[]> => {
  return balanceService.getAllBalances();
});

forward({
  from: kernelModel.events.appStarted,
  to: populateBalancesFx,
});

sample({
  clock: populateBalancesFx.doneData,
  target: $balances,
});

throttle({
  source: $balances,
  timeout: 5000,
  target: insertBalancesFx,
});

sample({
  clock: balanceUpdated,
  source: $balances,
  fn: (balances, newBalance) => {
    const oldBalanceIndex = balances.findIndex((balance) => {
      const isSameAccount = balance.accountId === newBalance.accountId;
      const isSameAssetId = balance.assetId === newBalance.assetId;
      const isSameChainId = balance.chainId === newBalance.chainId;

      return isSameAccount && isSameAssetId && isSameChainId;
    });

    if (oldBalanceIndex !== -1) {
      balances[oldBalanceIndex] = {
        ...balances[oldBalanceIndex],
        ...newBalance,
      };
    } else {
      balances.push(newBalance);
    }

    return [...balances];
  },
  target: $balances,
});

export const balanceModel = {
  $balances,
  events: {
    balanceUpdated,
  },
};
