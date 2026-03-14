import { type ChainId, type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';
import { type ValidatorMap } from '../_lib/types';

import {
  type NominatorsResourceParams,
  type ValidatorsResourceParams,
  nominatorsCacheKey,
  nominatorsResource,
  validatorsResource,
} from './resource';

const EMPTY_MAP: ValidatorMap = {};

export const useValidators = (params: NullableMap<ValidatorsResourceParams>) => {
  return useResource(validatorsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_MAP,
    map: (cache: Record<ChainId, ValidatorMap>, p: ValidatorsResourceParams) => cache[p.chainId] ?? EMPTY_MAP,
  });
};

export const useNominators = (params: NullableMap<NominatorsResourceParams>) => {
  return useResource(nominatorsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_MAP,
    map: (cache, p: NominatorsResourceParams) => cache[nominatorsCacheKey(p.chainId, p.stash)] ?? EMPTY_MAP,
  });
};
