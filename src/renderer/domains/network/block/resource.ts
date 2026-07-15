import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { createStore } from 'effector';
import { produce } from 'immer';

import { type Chain, type ChainId } from '@/shared/core';
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

/**
 * Each chain's expected block time, cached for the life of the session.
 *
 * Keyed by the _chain_, not by the api, because the answer is read from the
 * chain — `getExpectedBlockTime` prefers the config's `defaultBlockTime` over
 * anything the runtime says. A caller that pairs an api with someone else's
 * chain (say a parachain's config with its relay's api, to date a block on the
 * relay's timeline) would otherwise file that chain's block time under the
 * relay's key and quietly corrupt it for everyone else.
 */
export const blockTimeResource = createQueryResource<{ api: ApiPromise; chain: Chain }>({
  key: ({ chain }) => chain.chainId,
})
  .request<BN>(({ api, chain }) => getExpectedBlockTime(api, chain))
  .retry({ delay: 500, count: 5 })
  .cache<Record<ChainId, BN>>({
    staleAfter: Number.POSITIVE_INFINITY,
    store: createStore({}),
    map(cache, block, { chain }) {
      return produce(cache, draft => {
        draft[chain.chainId] = block;
      });
    },
  })
  .build();
