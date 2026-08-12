import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type ApyResourceParams, type NetworkAvgRateParams, apyResource, networkAvgRateResource } from './resource';
import { type NetworkAvgRate } from './service';

export const useNetworkApy = (params: NullableMap<ApyResourceParams>) => {
  return useResource(apyResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as string | undefined,
    map: (cache, { chainId }) => cache[chainId] ?? undefined,
  });
};

export const useNetworkAvgRate = (params: NullableMap<NetworkAvgRateParams>) => {
  return useResource(networkAvgRateResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as NetworkAvgRate | undefined,
    map: (cache, { chainId }) => cache[chainId] ?? undefined,
  });
};
