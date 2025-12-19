import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type VotingSubscriptionParams, subscriptionResource } from './resource';

export const useVoting = (params: NullableMap<VotingSubscriptionParams>) => {
  return useResource(subscriptionResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: {},
    map: (cache, { api }) => cache[api.genesisHash.toHex()] ?? {},
  });
};
