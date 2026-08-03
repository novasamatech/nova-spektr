import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type ExposurePagesResourceParams,
  type ExposuresResourceParams,
  exposurePagesCacheKey,
  exposurePagesResource,
  exposuresResource,
} from './resource';
import { type ExposureMap, type ExposureOverviewMap } from './types';

const EMPTY_OVERVIEWS: ExposureOverviewMap = {};
const EMPTY_EXPOSURES: ExposureMap = {};

export const useExposures = (params: NullableMap<ExposuresResourceParams>) => {
  return useResource(exposuresResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_OVERVIEWS,
    map: (cache, { chainId, era }) => {
      const entry = cache[chainId];

      return entry?.era === era ? entry.overviews : undefined;
    },
  });
};

export const useExposurePages = (params: NullableMap<ExposurePagesResourceParams>) => {
  return useResource(exposurePagesResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_EXPOSURES,
    map: (cache, { chainId, era, validators }) => cache[exposurePagesCacheKey(chainId, era, validators)],
  });
};
