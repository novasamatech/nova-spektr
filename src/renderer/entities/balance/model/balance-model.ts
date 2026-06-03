import { createEffect, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { readonly, spread } from 'patronum';

import { balanceMapper, storageService } from '@/shared/api/storage';
import { type Balance, type BalanceDraft, type BalanceMap } from '@/shared/core';
import { createBuffer, createQueuedEffect, populated } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { balanceUtils } from '../lib/balance-utils';

const balancesSet = createEvent<Balance[]>();
const balancesUpdated = createEvent<(Balance | BalanceDraft)[]>();
const balancesRemoved = createEvent<AccountId[]>();
const clearUnwantedBalances = createEvent<{ existingAccounts: AccountId[] }>();

const $balanceMap = createStore<BalanceMap>({});
const $balances = $balanceMap.map((m) => Object.values(m));

const bufferedUpdate = createBuffer({
  source: sample({ clock: [balancesSet, balancesUpdated] }),
  timeframe: 1000,
});

const logErrorFx = createEffect(async (error: Error) => {
  console.error('Error while working with balances', error);
});

const insertBalancesFx = createQueuedEffect(async (balances: Balance[]) => {
  await storageService.balances.insertAll(balances.map(balanceMapper.toDB));
  return balances;
});

const removeBalancesFx = createQueuedEffect(async (balances: Balance[]) => {
  return storageService.balances.deleteAll(balances.map((b) => b.id)).then((ids) => ids ?? []);
});

const populateFx = createQueuedEffect(async (): Promise<Balance[]> => {
  return storageService.balances.readAll().then((balances) => balances.map(balanceMapper.fromDB));
});
const $populated = populated(populateFx);

sample({
  clock: bufferedUpdate,
  source: $balanceMap,
  fn: (balanceMap, buffer) => {
    const { map, updated } = balanceUtils.mergeBalanceMapWithNewBalances(balanceMap, buffer.flat());

    return {
      store: map,
      save: Object.values(updated),
    };
  },
  target: spread({
    store: $balanceMap,
    save: insertBalancesFx,
  }),
});

sample({
  clock: balancesRemoved,
  source: $balances,
  fn: (balances, accounts) => balances.filter((b) => accounts.includes(b.accountId)),
  target: removeBalancesFx,
});

sample({
  clock: clearUnwantedBalances,
  source: $balances,
  fn: (balances, { existingAccounts }) => {
    if (existingAccounts.length === 0) return balances;
    return balances.filter((b) => !existingAccounts.includes(b.accountId));
  },
  target: removeBalancesFx,
});

sample({
  clock: removeBalancesFx.doneData,
  source: $balanceMap,
  filter: (_, removed) => removed.length > 0,
  fn(map, removed) {
    return produce(map, (draft) => {
      for (const id of removed) {
        delete draft[id];
      }
    });
  },
  target: $balanceMap,
});

sample({
  clock: populateFx.doneData,
  fn: (balances) => {
    return balances.reduce<BalanceMap>((acc, balance) => {
      acc[balance.id] = balance;
      return acc;
    }, {});
  },
  target: $balanceMap,
});

sample({
  clock: [populateFx.failData, insertBalancesFx.failData],
  target: logErrorFx,
});

export const balanceModel = {
  $balances,
  $balanceMap: readonly($balanceMap),
  $populated,

  populate: populateFx,

  balancesUpdated,
  balancesRemoved,
  clearUnwantedBalances,

  __test: {
    $balanceMap,
    $populated,
    removeBalancesFx,
  },
};
