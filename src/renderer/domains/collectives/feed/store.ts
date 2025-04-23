import { createStore } from 'effector';
import { readonly } from 'patronum';

import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { deriveFromResources } from '@/shared/resource';
import { type CollectivesStruct } from '../_lib/types';

import { feedSubscriptionResource } from './resource';
import { type FeedRecord } from './types';

const $feed = createStore<CollectivesStruct<FeedRecord[]>>({});

deriveFromResources({
  store: $feed,
  resources: [feedSubscriptionResource],
  map(state, feed) {
    const prev = pickNestedValue(state, feed.pallet, feed.chainId) ?? [];
    const newList = merge({
      a: prev,
      b: feed.data,
      mergeBy: a => [a.accountId, a.block, a.type],
      sort: (a, b) => b.block - a.block,
    });

    return setNestedValue(state, feed.pallet, feed.chainId, newList);
  },
});

export const feed = {
  $list: readonly($feed),
  unsubscribe: feedSubscriptionResource.unsubscribe,
  subscribe: feedSubscriptionResource.subscribe,
};
