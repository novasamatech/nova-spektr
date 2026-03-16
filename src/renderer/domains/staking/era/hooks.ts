import { type ChainId, type EraIndex, type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type EraResourceParams, eraResource } from './resource';

export const useActiveEra = (
  params: NullableMap<EraResourceParams>,
): { data: EraIndex | undefined; pending: boolean } => {
  return useResource(eraResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as EraIndex | undefined,
    map: (cache: Record<ChainId, EraIndex>, p: EraResourceParams) => cache[p.chainId],
  });
};
