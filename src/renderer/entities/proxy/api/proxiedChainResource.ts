import { createStore } from 'effector';
import { GraphQLClient } from 'graphql-request';

import { persist } from '@/shared/api/storage';
import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';

import { proxiedChainsService } from './proxiedChainsService';

type ProxiedChainParams = {
  accountId: AccountId;
  indexerUrl: string;
};

const $cache = createStore<Record<string, ChainId | null>>({});

persist({ store: $cache, key: 'proxiedChainCache' });

export const proxiedChainResource = createQueryResource<ProxiedChainParams>({
  key: ({ accountId }) => accountId,
})
  .name('proxiedChain')
  .request(async ({ accountId, indexerUrl }) => {
    const client = new GraphQLClient(indexerUrl);
    const chainIds = await proxiedChainsService.getProxiedChainIds(client, accountId);

    return chainIds.at(0) ?? null;
  })
  .retry({ count: 3, delay: 1000 })
  .cache({
    store: $cache,
    map(cache, result, params) {
      return { ...cache, [params.accountId]: result };
    },
  })
  .build();
