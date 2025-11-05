import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type CodexRequestParams, codexResource } from './resource';

export const useCodex = (params: NullableMap<CodexRequestParams>) => {
  return useResource(codexResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map(cache, { palletType, chainId }) {
      return cache[palletType]?.[chainId];
    },
  });
};
