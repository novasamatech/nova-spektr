import { type ApiPromise } from '@polkadot/api';
import { createEffect, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId, type Conviction } from '@/shared/core';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { delegateValidateModel } from '@/features/operations/OperationsValidation';

type Store = Record<ChainId, Record<Conviction, number>>;
type RequestParams = { api: ApiPromise; chain: Chain };

const $lockPeriods = createStore<Store>({});

const requestLockPeriodsFx = createEffect<RequestParams, Record<Conviction, number>>(async ({ api }) => {
  return locksService.getLockPeriods(api);
});

sample({
  clock: requestLockPeriodsFx.done,
  source: $lockPeriods,
  fn: (lockPeriods, { params, result }) => {
    return { ...lockPeriods, [params.chain.chainId]: result };
  },
  target: $lockPeriods,
});

sample({
  clock: delegateValidateModel.validate,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
  },
  fn: ({ apis, chains }, { transaction }) => ({
    api: apis[transaction.chainId],
    chain: chains[transaction.chainId],
  }),
  target: requestLockPeriodsFx,
});

export const lockPeriodsModel = {
  $lockPeriods: readonly($lockPeriods),
  $isLoading: requestLockPeriodsFx.pending,

  requestLockPeriods: requestLockPeriodsFx,
};
