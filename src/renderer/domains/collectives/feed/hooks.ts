import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type FeedSubscriptionParams, feedSubscriptionResource } from './resource';

export const useFeed = (params: NullableMap<FeedSubscriptionParams>) => {
  return useResource(feedSubscriptionResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map(cache, { palletType, chain }) {
      return cache[palletType]?.[chain.chainId];
    },
  });
};
