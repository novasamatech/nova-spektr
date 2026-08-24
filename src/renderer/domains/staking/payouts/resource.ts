import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { getEraStorage } from '../era-storage';
import { type RewardSource } from '../types';

import { getUnclaimedPayouts } from './service';
import { type UnclaimedPayouts } from './types';

export type PayoutsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  stash: AccountId;
  activeEra: EraIndex;
  historyDepth: number;
  rewardSources: RewardSource[];
};

export function payoutsCacheKey(chainId: ChainId, stash: AccountId, activeEra: EraIndex): string {
  return `${chainId}-${stash}-${activeEra}`;
}

const $payoutsCache = createStore<Record<string, UnclaimedPayouts>>({});

/**
 * Not cached forever — a landed payout has to disappear from the list without
 * waiting for the next era.
 */
export const payoutsResource = createQueryResource<PayoutsResourceParams>({
  key: ({ chainId, stash, activeEra }) => [chainId, stash, activeEra],
})
  .name('unclaimed-payouts')
  .request<UnclaimedPayouts>(({ chainId, api, stash, activeEra, historyDepth, rewardSources }) => {
    return getUnclaimedPayouts({
      api,
      stash,
      activeEra,
      historyDepth,
      rewardSources,
      storage: getEraStorage(chainId),
    });
  })
  .cache({
    store: $payoutsCache,
    map: (state, payouts, { chainId, stash, activeEra }) => ({
      ...state,
      [payoutsCacheKey(chainId, stash, activeEra)]: payouts,
    }),
    staleAfter: 5 * 60 * 1000,
  })
  .build();
