import { createEvent, createStore, sample } from 'effector';

import type { Account } from '@shared/core';

const queryChanged = createEvent<string>();

const $query = createStore<string>('');
const $activeShards = createStore<Account[]>([]);
const $hideZeroBalances = createStore<boolean>(false);

sample({
  clock: queryChanged,
  target: $query,
});

export const assetsModel = {
  $query,
  $activeShards,
  $hideZeroBalances,
  events: {
    queryChanged,
  },
};
