import { type ChainId, type EraIndex, type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type EraProgress,
  type EraProgressResourceParams,
  type EraResourceParams,
  eraProgressResource,
  eraResource,
} from './resource';

export const useActiveEra = (
  params: NullableMap<EraResourceParams>,
): { data: EraIndex | undefined; pending: boolean } => {
  return useResource(eraResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as EraIndex | undefined,
    map: (cache: Record<ChainId, EraIndex>, p: EraResourceParams) => cache[p.chainId],
  });
};

/**
 * Stable anchor of the given era — derive countdowns from it on the client.
 */
export const useEraProgress = (params: NullableMap<EraProgressResourceParams>) => {
  return useResource(eraProgressResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null as EraProgress,
    map: (cache, { chainId, era }) => {
      const entry = cache[chainId];
      if (entry === undefined) return undefined;
      if (entry === null) return null;

      return entry.era === era ? entry : undefined;
    },
  });
};
