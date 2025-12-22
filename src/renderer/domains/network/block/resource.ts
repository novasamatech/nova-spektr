import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { createStore } from 'effector';
import { produce } from 'immer';

import { type ChainId } from '@/shared/core';
import { getExpectedBlockTime } from '@/shared/lib/utils';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { createQueryResource, createSubscriptionResource } from '@/shared/query';

export const blockResource = createSubscriptionResource<{ api: ApiPromise }>({
  key: ({ api }) => api.genesisHash.toHex(),
})
  .subscribe<BlockHeight>(({ api }, callback) => {
    const unsubscribe = api.rpc.chain.subscribeNewHeads(header => {
      callback(header.number.toNumber() as BlockHeight);
    });

    return () => unsubscribe.then(fn => fn());
  })
  .cache<Record<ChainId, BlockHeight>>({
    store: createStore({}),
    map(cache, block, { api }) {
      return produce(cache, draft => {
        draft[api.genesisHash.toHex()] = block;
      });
    },
  })
  .build();

export const blockTimeResource = createQueryResource<{ api: ApiPromise }>({
  key: ({ api }) => api.genesisHash.toHex(),
})
  .request<BN>(({ api }) => getExpectedBlockTime(api))
  .retry({ delay: 500, count: 5 })
  .cache<Record<ChainId, BN>>({
    staleAfter: Number.POSITIVE_INFINITY,
    store: createStore({}),
    map(cache, block, { api }) {
      return produce(cache, draft => {
        draft[api.genesisHash.toHex()] = block;
      });
    },
  })
  .build();
