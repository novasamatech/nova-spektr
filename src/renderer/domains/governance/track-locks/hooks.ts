import { type BN } from '@polkadot/util';

import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import { type TrackLocksRequestParams, trackLocksResource } from './resource';

const EMPTY: Record<AccountId, Record<string, BN>> = {};

export const useTrackLocks = (params: NullableMap<TrackLocksRequestParams>) => {
  return useResource(trackLocksResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY,
    map: (cache, { api }) => cache[api.genesisHash.toHex()] ?? EMPTY,
  });
};
