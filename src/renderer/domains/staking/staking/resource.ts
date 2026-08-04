import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';
import { type StakingMap } from '../types';

import { subscribeStaking } from './service';

export type StakingResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  accounts: AccountId[];
};

const $stakingCache = createStore<Record<ChainId, StakingMap>>({});

export const stakingResource = createSubscriptionResource<StakingResourceParams>({
  key: ({ chainId, accounts }) => [chainId, accounts.join('_')],
})
  .subscribe<StakingMap>(({ chainId, api, accounts }, callback) => {
    return subscribeStaking(chainId, api, accounts, callback);
  })
  .cache({
    store: $stakingCache,
    // Merged, not replaced: the key carries the account list but the cache is
    // chain-keyed, so two live subscriptions on one chain with different account
    // sets would otherwise overwrite each other and make the loser's positions
    // disappear. `buildStakingMap` writes an explicit `undefined` for an
    // unbonded account, so merging cannot resurrect a stale ledger.
    map: (state, staking, { chainId }) => ({
      ...state,
      [chainId]: { ...state[chainId], ...staking },
    }),
  })
  .build();
