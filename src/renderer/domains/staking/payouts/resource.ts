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

/** How long a complete answer is reused — a landed payout still disappears soon. */
export const PAYOUTS_STALE_AFTER = 5 * 60 * 1000;
/** A partial or unavailable answer is retried on the next request after this. */
export const PAYOUTS_INCOMPLETE_STALE_AFTER = 30 * 1000;

/**
 * Not cached forever — a landed payout has to disappear from the list without
 * waiting for the next era. An answer that is not complete is kept only
 * briefly, so the next mount asks again instead of repeating a failed read.
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
    staleAfter: payouts => (payouts.completeness === 'complete' ? PAYOUTS_STALE_AFTER : PAYOUTS_INCOMPLETE_STALE_AFTER),
  })
  .build();
