import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type ApyResourceParams, apyResource } from './resource';

export const useNetworkApy = (params: NullableMap<ApyResourceParams>) => {
  return useResource(apyResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as string | undefined,
    map: (cache, { chainId }) => cache[chainId] ?? undefined,
  });
};
