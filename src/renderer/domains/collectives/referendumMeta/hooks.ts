import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type ReferendumMetaRequestParams, referendumMetaResource } from './resource';

export const useReferendumMeta = (params: NullableMap<ReferendumMetaRequestParams>) => {
  return useResource(referendumMetaResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map(cache, { palletType, chainId }) {
      return cache[palletType]?.[chainId];
    },
  });
};

