import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type EraThresholdsResourceParams, eraThresholdsKey, eraThresholdsResource } from './resource';
import { type EraThreshold } from './types';

export const useEraThresholds = (params: NullableMap<EraThresholdsResourceParams>) => {
  return useResource(eraThresholdsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as EraThreshold[] | undefined,
    map: (cache, { chainId, era, depth }) => {
      const entry = cache[eraThresholdsKey(chainId, depth)];

      return entry?.era === era ? entry.thresholds : undefined;
    },
  });
};
