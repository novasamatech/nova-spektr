import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type ReferendumSubscriptionParams,
  type ReferendumsMapToGovernanceParams,
  collectivesReferendumsMapToGovernanceResource,
  subscriptionResource,
} from './resource';

export const useReferendums = (params: NullableMap<ReferendumSubscriptionParams>) => {
  return useResource(subscriptionResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: [],
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};

export const useReferendumsMapToGovernance = (params: NullableMap<ReferendumsMapToGovernanceParams>) => {
  return useResource(collectivesReferendumsMapToGovernanceResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: {},
    map: (cache, { palletType, chain }) => cache[palletType]?.[chain.chainId],
  });
};
