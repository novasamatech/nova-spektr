import { createStore } from 'effector';

import { type GovernanceApi } from '@/shared/api/governance';
import { type Chain, type ChainId, type ReferendumId } from '@/shared/core';
import { createQueryResource } from '@/shared/query';

export type ReferendumTitleSubscriptionParams = {
  chain: Chain;
  service: GovernanceApi;
};

type TitlesCache = Record<ChainId, Record<ReferendumId, string>>;

const $sharedTitlesCache = createStore<TitlesCache>({});

export const referendumTitleResource = createQueryResource<ReferendumTitleSubscriptionParams>({
  key: ({ chain }) => [chain.chainId],
})
  .request<Record<ReferendumId, string>>(({ chain, service }) => {
    return new Promise(resolve => {
      let result: Record<ReferendumId, string> = {};

      service.getReferendumList(chain, data => {
        if (!data.done && data.value) {
          result = { ...result, ...data.value };
        }

        if (data.done) {
          resolve(result);
        }
      });
    });
  })
  .cache({
    store: $sharedTitlesCache,
    map: (state, titles, { chain }) => {
      const chainId = chain.chainId;
      const prev = state[chainId] ?? {};

      return { ...state, [chainId]: { ...prev, ...titles } };
    },
  })
  .build();
