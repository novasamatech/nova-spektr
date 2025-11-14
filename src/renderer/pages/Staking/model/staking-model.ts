import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingMap, stakingResource } from '@/entities/staking';

type StakingParams = {
  chainId: ChainId | null;
  api: ApiPromise | null;
  accounts: AccountId[];
};

const stakingParamsChanged = createEvent<StakingParams>();
const reset = createEvent<void>();

const $stakingParams = createStore<StakingParams>({ chainId: null, api: null, accounts: [] })
  .on(stakingParamsChanged, (_, params) => params)
  .reset(reset);

// Staking data store
const $stakingData = createStore<StakingMap>({})
  .on(stakingResource.push, (_, { result }) => result ?? {})
  .reset(reset);

const $isStakingLoading = combine(
  stakingResource.pending,
  stakingResource.subscribed,
  (pending, subscribed) => pending && !subscribed,
);

sample({
  clock: stakingParamsChanged,
  filter: ({ chainId, api, accounts }) => nonNullable(chainId) && nonNullable(api) && accounts.length > 0,
  fn: ({ chainId, api, accounts }) => ({
    chainId: chainId!,
    api: api!,
    accounts,
  }),
  target: stakingResource.subscribe,
});

sample({
  clock: reset,
  target: stakingResource.unsubscribe,
});

export const stakingModel = {
  $stakingData,
  $stakingParams,
  $isStakingLoading,
  $subscribed: stakingResource.subscribed,

  stakingParamsChanged,
  reset,
};
