import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type TracksRequestParams, tracksResource } from './resource';

export const useTracks = (params: NullableMap<TracksRequestParams>) => {
  return useResource(tracksResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: {},
    map: (cache, { api }) => cache[api.genesisHash.toHex()] ?? {},
  });
};
