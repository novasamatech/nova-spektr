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
  map(state, feed, meta) {
    const {
      chain: { chainId },
      palletType,
    } = meta;

    const prev = pickNestedValue(state, palletType, chainId) ?? [];
    const newList = merge({
      a: prev,
      b: feed,
      mergeBy: a => [a.accountId, a.block, a.type],
      sort: (a, b) => b.block - a.block,
    });

    return setNestedValue(state, palletType, chainId, newList);
  },
});

export const feed = {
  $list: readonly($feed),
  unsubscribe: feedSubscriptionResource.unsubscribe,
  subscribe: feedSubscriptionResource.subscribe,
};
