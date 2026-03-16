import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { createSubscriptionResource } from '@/shared/query';

import { eraService } from './service';

export type EraResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
};

const $eraCache = createStore<Record<ChainId, EraIndex>>({});

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
