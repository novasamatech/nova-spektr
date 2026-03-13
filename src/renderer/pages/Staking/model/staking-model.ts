import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { stakingResource } from '@/entities/staking';

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

const $currentKey = createStore<ResourceRequestKey | null>(null).reset(reset);

const $stakingData = combine(stakingResource.$cache, $stakingParams, (cache, params) =>
  params.chainId ? (cache[params.chainId] ?? {}) : {},
);

const $isStakingLoading = combine(
  {
    stakingData: $stakingData,
    params: $stakingParams,
    hasKey: $currentKey.map(nonNullable),
  },
  ({ stakingData, params, hasKey }) => {
    if (params.accounts.length === 0) return false;
    if (!params.api || !params.chainId) return true;
    if (!hasKey) return true;
    if (Object.keys(stakingData).length === 0) return true;

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
  clock: stakingParamsChanged,
  filter: ({ chainId, api, accounts }) => nonNullable(chainId) && nonNullable(api) && accounts.length > 0,
  fn: ({ chainId, api, accounts }) =>
    stakingResource.createKey({
      chainId: chainId!,
      api: api!,
      accounts,
    }),
  target: $currentKey,
});

sample({
  clock: reset,
  source: $currentKey,
  filter: nonNullable,
  target: stakingResource.unsubscribe,
});

export const stakingModel = {
  $stakingData,
  $stakingParams,
  $isStakingLoading,
  $subscribed: $currentKey.map(nonNullable),

  stakingParamsChanged,
  reset,
};
