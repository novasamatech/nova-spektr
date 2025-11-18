import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type ClaimantRequestParams,
  type SalariesRequestParams,
  type SalaryCycleRequestParams,
  claimantStatusResource,
  salariesResource,
  salaryCycleResource,
} from './resource';

export const useSalaries = (params: NullableMap<SalariesRequestParams>) => {
  return useResource(salariesResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};

export const useSalaryCycleResource = (params: NullableMap<SalaryCycleRequestParams>) => {
  return useResource(salaryCycleResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null,
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};

export const useSalaryClaimStatusResource = (params: NullableMap<ClaimantRequestParams>) => {
  return useResource(claimantStatusResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: {},
    map: (cache, { palletType, api }) => cache[palletType]?.[api.genesisHash.toHex()],
  });
};
