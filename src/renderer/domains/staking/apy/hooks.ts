import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';
import { readEraScoped } from '../era-scoped';

import { type ApyResourceParams, apyResource } from './resource';

export const useNetworkApy = (params: NullableMap<ApyResourceParams>) => {
  return useResource(apyResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as string | undefined,
    map: (cache, { chainId, era }) => readEraScoped(cache[chainId], era) ?? undefined,
  });
};
