import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type ReferendumTitleSubscriptionParams, referendumTitleResource } from './resource';

export const useReferendumTitles = (params: NullableMap<ReferendumTitleSubscriptionParams>) => {
  return useResource(referendumTitleResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: {},
    map: (cache, { chain }) => cache[chain.chainId] ?? {},
  });
};
