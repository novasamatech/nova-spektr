import { createEffect, createEvent, createStore, sample } from 'effector';

import { balanceMapper, storageService } from '@/shared/api/storage';
import { type Balance } from '@/shared/core';
import { createBuffer } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '../lib/balance-utils';

const balancesSet = createEvent<Balance[]>();
const balancesUpdated = createEvent<Balance[]>();
const balancesRemoved = createEvent<AccountId[]>();

const $balances = createStore<Balance[]>([]);

const bufferedUpdate = createBuffer({
  source: sample({ clock: [balancesSet, balancesUpdated] }),
  timeframe: 1000,
});

const insertBalancesFx = createEffect(async (balances: Balance[]) => {
  await storageService.balances.insertAll(balances.map(balanceMapper.toDB));
  return balances;
});

const removeBalancesFx = createEffect(async (ids: string[]) => {
  await storageService.balances.deleteAll(ids);
});

const populateFx = createEffect(async (): Promise<Balance[]> => {
  return storageService.balances.readAll().then((balances) => balances.map(balanceMapper.fromDB));
});

sample({
  clock: bufferedUpdate,
  fn(buffer) {
    return buffer.reduce(balanceUtils.getMergeBalances, []);
  },
  target: insertBalancesFx,
});

sample({
  clock: insertBalancesFx.doneData,
  source: $balances,
  fn: balanceUtils.getMergeBalances,
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

sample({
  clock: populateFx.doneData,
  target: $balances,
});

export const balanceModel = {
  $balances,

  populate: populateFx,

  events: {
    balancesSet,
    balancesUpdated,
    balancesRemoved,
  },
  __test: {
    removeBalancesFx,
  },
};
