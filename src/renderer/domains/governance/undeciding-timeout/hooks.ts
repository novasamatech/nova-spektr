import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type UndecidingTimeoutRequestParams, undecidingTimeoutResource } from './resource';

export const useUndecidingTimeout = (params: NullableMap<UndecidingTimeoutRequestParams>) => {
  return useResource(undecidingTimeoutResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: 0,
    map: (cache, { api }) => cache[api.genesisHash.toHex()] ?? 0,
  });
};
