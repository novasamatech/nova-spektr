import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { type RewardSource } from '../types';

import { getEraValidatorRewards } from './service';
import { type EraValidatorReward } from './types';

export type EraRewardsParams = {
  chainId: ChainId;
  api: ApiPromise;
  stashes: AccountId[];
  eraFrom: EraIndex;
  eraTo: EraIndex;
  rewardSources: RewardSource[];
};

/**
 * Keyed by the stash set as well as the era range: one chain+range key would be
 * shared by every selection on that chain, and a consumer reading it back would
 * see rewards for accounts that were not in its request.
 */
export function eraRewardsCacheKey(chainId: ChainId, stashes: AccountId[], eraFrom: EraIndex, eraTo: EraIndex): string {
  return `${chainId}-${[...stashes].sort().join('_')}-${eraFrom}-${eraTo}`;
}

const $eraRewardsCache = createStore<Record<string, EraValidatorReward[]>>({});

/**
 * A closed era never changes its arithmetic, so the window is long — the range
 * moves with the active era, which changes the key anyway.
 */
export const eraRewardsResource = createQueryResource<EraRewardsParams>({
  key: ({ chainId, stashes, eraFrom, eraTo }) => [chainId, eraFrom, eraTo, ...stashes],
})
  .name('era-validator-rewards')
  .request<EraValidatorReward[]>(({ api, stashes, eraFrom, eraTo, rewardSources }) => {
    return getEraValidatorRewards({ api, stashes, eraFrom, eraTo, rewardSources });
  })
  .cache({
    store: $eraRewardsCache,
    map: (state, rewards, { chainId, stashes, eraFrom, eraTo }) => ({
      ...state,
      [eraRewardsCacheKey(chainId, stashes, eraFrom, eraTo)]: rewards,
    }),
    staleAfter: 30 * 60 * 1000,
  })
  .build();
