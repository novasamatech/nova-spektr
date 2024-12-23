import { createEffect, createEvent, createStore, sample } from 'effector';
import { throttle } from 'patronum';

import { balanceMapper, storageService } from '@/shared/api/storage';
import { type Balance, type ID } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '../lib/balance-utils';
import { BUFFER_DELAY, SAVE_TIMEOUT } from '../lib/constants';

const balancesSet = createEvent<Balance[]>();
const balancesUpdated = createEvent<Balance[]>();
const balancesRemoved = createEvent<AccountId[]>();

const $balances = createStore<Balance[]>([]);
const $balancesBuffer = createStore<Balance[]>([]);

const insertBalancesFx = createEffect(async (balances: Balance[]): Promise<void> => {
  const dbBalances = balances.map(balanceMapper.toDB);

  await storageService.balances.insertAll(dbBalances);
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
  source: $balances,
  fn: (balances, accounts) => {
    return balances.filter((b) => accounts.includes(b.accountId)).map((b) => b.id);
  },
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
