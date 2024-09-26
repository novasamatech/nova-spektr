import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId, type Conviction } from '@shared/core';
import { locksService } from '@entities/governance';

type Store = Record<ChainId, Record<Conviction, number>>;
type RequestParams = { api: ApiPromise; chain: Chain };

const $lockPeriods = createStore<Store>({});

const requestLockPeriods = createEvent<RequestParams>();

const requestLockPeriodsFx = createEffect<RequestParams, Record<Conviction, number>>(async ({ api }) => {
  return locksService.getLockPeriods(api);
});

sample({
  clock: requestLockPeriods,
  target: requestLockPeriodsFx,
});

sample({
  clock: requestLockPeriodsFx.done,
  source: $lockPeriods,
  fn: (lockPeriods, { params, result }) => {
    return { ...lockPeriods, [params.chain.chainId]: result };
  },
  target: $lockPeriods,
});

export const lockPeriodsModel = {
  $lockPeriods: readonly($lockPeriods),
  $isLoading: requestLockPeriodsFx.pending,

  events: {
    requestLockPeriods,
  },
};
