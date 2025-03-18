import { createStore } from 'effector';

import { type Chain } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { merge, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { fetchAllActivities } from './resource';
import { type FeedRecord } from './types';

const $feed = createStore<CollectivesStruct<FeedRecord[]>>({});

type SubscriptionParams = {
  palletType: CollectivePalletsType;
  chain: Chain;
};

const {
  $: $list,
  subscribe,
  unsubscribe,
} = createDataSubscription<CollectivesStruct<FeedRecord[]>, SubscriptionParams, FeedRecord[]>({
  key: ({ palletType, chain }) => `${palletType}-${chain.chainId}`,
  initial: $feed,
  fn({ chain, palletType }: SubscriptionParams, callback) {
    const url = chain.externalApi?.collectives.find(x => x.type === 'subquery')?.url;
    if (nullable(url)) {
      throw new Error(`Collectives indexer doesn't support ${chain.name} chain`);
    }

    const fn = () => {
      fetchAllActivities(url, palletType).then(value => {
        callback({ done: true, value });
      });
    };

    fn();

    const interval = setInterval(fn, 60000);
    return () => clearInterval(interval);
  },
  map(store, { params, result }) {
    const prev = pickNestedValue(store, params.palletType, params.chain.chainId) ?? [];
    const newList = merge({
      a: prev,
      b: result,
      mergeBy: a => [a.accountId, a.block, a.type],
      sort: (a, b) => b.block - a.block,
    });

    return setNestedValue(store, params.palletType, params.chain.chainId, newList);
  },
});

export const feed = {
  $list,
  subscribe,
  unsubscribe,
};
