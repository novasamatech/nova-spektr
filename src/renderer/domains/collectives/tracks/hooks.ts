import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type RequestMaxRankParams, type RequestTracksParams, maxRankResource, tracksResource } from './resource';

export const useTracks = (params: NullableMap<RequestTracksParams>) => {
  return useResource(tracksResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};

export const useMaxRank = (params: NullableMap<RequestMaxRankParams>) => {
  return useResource(maxRankResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};
