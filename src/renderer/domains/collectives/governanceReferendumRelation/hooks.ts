import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type ReferendumsMapToGovernanceParams, collectivesReferendumsMapToGovernanceResource } from './resource';

export const useReferendumsMapToGovernance = (params: NullableMap<ReferendumsMapToGovernanceParams>) => {
  return useResource(collectivesReferendumsMapToGovernanceResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: {},
    map: (cache, { palletType, chain }) => cache[palletType]?.[chain.chainId],
  });
};
