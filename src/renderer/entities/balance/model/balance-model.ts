import { createEffect, createEvent, createStore, sample } from 'effector';
import { throttle } from 'patronum';
import { isEqual } from 'lodash';

import { Balance } from '@shared/core';
import { ZERO_BALANCE, splice } from '@shared/lib/utils';
import { useBalanceService, SAVE_TIMEOUT } from '../lib';

const balanceService = useBalanceService();

const balanceUpdated = createEvent<Balance>();

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
  clock: balanceUpdated,
  source: $balances,
  filter: (_, newBalance) => {
    if (
      (!newBalance.free || newBalance.free === ZERO_BALANCE) &&
      (!newBalance.reserved || newBalance.reserved === ZERO_BALANCE) &&
      (!newBalance.frozen || newBalance.frozen === ZERO_BALANCE) &&
      (!newBalance.locked || newBalance.locked.length === 0)
    ) {
      return false;
    }

    return true;
  },
  fn: (balances, newBalance) => {
    const oldBalanceIndex = balances.findIndex((balance) => {
      const isSameAccount = balance.accountId === newBalance.accountId;
      const isSameAssetId = balance.assetId === newBalance.assetId;
      const isSameChainId = balance.chainId === newBalance.chainId;

      return isSameAccount && isSameAssetId && isSameChainId;
    });

    if (oldBalanceIndex === -1) return balances.concat(newBalance);

    const updatedBalance = { ...balances[oldBalanceIndex], ...newBalance };

    if (isEqual(updatedBalance, balances[oldBalanceIndex])) return balances;

    return splice(balances, updatedBalance, oldBalanceIndex);
  },
  target: $balances,
});

export const balanceModel = {
  $balances,
  events: {
    balanceUpdated,
  },
};
