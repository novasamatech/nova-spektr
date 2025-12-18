import { type NullableMap } from '@/shared/core';
import { dictionary, nonNullable, nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type ReferendumSummaryRequestParams, referendumSummaryResource } from './resource';

export const useReferendumSummary = (params: NullableMap<ReferendumSummaryRequestParams>) => {
  return useResource(referendumSummaryResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map(cache, { chainId, referendumIds }) {
      const chainCache = cache[chainId];
      if (!chainCache) return null;

      const summaries = referendumIds.map(id => chainCache[id]).filter(nonNullable);

      return dictionary(summaries, 'referendumId');
    },
  });
};
