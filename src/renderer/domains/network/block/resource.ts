import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';
import { produce } from 'immer';

import { type ChainId } from '@/shared/core';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { createSubscriptionResource } from '@/shared/query';

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
