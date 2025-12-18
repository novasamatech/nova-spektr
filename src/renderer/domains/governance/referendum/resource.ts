import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type Referendum } from '@/shared/core';
import { merge } from '@/shared/lib/utils';
import { createSubscriptionResource } from '@/shared/query';
import { governanceSubscribeService } from '@/entities/governance';

export type ReferendumSubscriptionParams = {
  api: ApiPromise;
};

const $sharedReferendumsCache = createStore<Record<ChainId, Referendum[]>>({});

export const subscriptionResource = createSubscriptionResource<ReferendumSubscriptionParams>({
  key: ({ api }) => [api.genesisHash.toHex()],
})
  .subscribe<Referendum[]>(({ api }, callback) => {
    return governanceSubscribeService.subscribeReferendums(api, result => {
      if (result.value) {
        callback(result.value);
      }
    });
  })
  .cache({
    store: $sharedReferendumsCache,
    map: (state, referendums, { api }) => {
      const chainId = api.genesisHash.toHex();
      const prev = state[chainId] ?? [];
      const merged = merge({ a: prev, b: referendums, mergeBy: r => r.referendumId });

      return { ...state, [chainId]: merged };
    },
  })
  .build();
