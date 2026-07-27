import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain, type ChainId, type EraIndex } from '@/shared/core';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';

import { type EraAnchor, eraService } from './service';

export type EraResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
};

export type EraProgressResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  timelineApi: ApiPromise;
  chain: Chain;
  era: EraIndex;
};

/**
 * `null` marks an era whose anchor the chain can't provide — the hook then
 * reports it as resolved-but-empty instead of spinning forever.
 */
export type EraProgress = (EraAnchor & { era: EraIndex }) | null;

const $eraCache = createStore<Record<ChainId, EraIndex>>({});
const $eraProgressCache = createStore<Record<ChainId, EraProgress>>({});

export const eraResource = createSubscriptionResource<EraResourceParams>({
  key: ({ chainId }) => [chainId],
})
  .subscribe<EraIndex | undefined>(({ api }, callback) => {
    return eraService.subscribeActiveEra(api, callback);
  })
  .cache({
    store: $eraCache,
    map: (state, era, { chainId }) => {
      if (era === undefined) return state;

      return { ...state, [chainId]: era };
    },
  })
  .build();

/**
 * Stable era anchor — never polled, replaced whenever a new era starts.
 */
export const eraProgressResource = createQueryResource<EraProgressResourceParams>({
  key: ({ chainId, era }) => [chainId, era],
})
  .name('era-progress')
  .request<EraAnchor | null>(({ api, timelineApi, chain }) => {
    return eraService.getEraStart(api, timelineApi, chain);
  })
  .cache({
    store: $eraProgressCache,
    map: (state, anchor, { chainId, era }) => ({
      ...state,
      [chainId]: anchor ? { era, ...anchor } : null,
    }),
    staleAfter: Infinity,
  })
  .build();
