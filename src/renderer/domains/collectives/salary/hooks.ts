import { type ApiPromise } from '@polkadot/api';

import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';
import { type CollectivePalletsType } from '../_lib/types';

import { type ClaimantRequestParams, claimantStatusResource, salaryCycleResource } from './resource';

export const useSalaryCycleResource = (palletType: CollectivePalletsType, api: ApiPromise | null) => {
  return useResource(salaryCycleResource, {
    params: api ? { palletType, api } : null,
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
