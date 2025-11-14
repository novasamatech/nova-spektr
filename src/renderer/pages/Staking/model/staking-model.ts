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
  {
    pending: stakingResource.pending,
    subscribed: stakingResource.subscribed,
    stakingData: $stakingData,
    params: $stakingParams,
  },
  ({ pending, subscribed, stakingData, params }) => {
    // If no accounts, not loading (empty state)
    if (params.accounts.length === 0) {
      return false;
    }

    // Loading if no API available but we have accounts
    if (!params.api || !params.chainId) {
      return true;
    }

    // Loading if subscription is pending
    if (pending && !subscribed) {
      return true;
    }

    // Loading if subscribed but no data received yet
    if (subscribed && Object.keys(stakingData).length === 0) {
      return true;
    }

    return false;
  },
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
