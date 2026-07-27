import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type MinBondResourceParams,
  type NominationsResourceParams,
  type PayeeResourceParams,
  minBondResource,
  nominationsResource,
  payeeResource,
} from './resource';
import { type NominationsMap, type PayeeMap } from './types';

const EMPTY_NOMINATIONS: NominationsMap = {};
const EMPTY_PAYEE: PayeeMap = {};

export const useNominations = (params: NullableMap<NominationsResourceParams>) => {
  return useResource(nominationsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_NOMINATIONS,
    map: (cache, { chainId }) => cache[chainId],
  });
};

export const usePayee = (params: NullableMap<PayeeResourceParams>) => {
  return useResource(payeeResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_PAYEE,
    map: (cache, { chainId }) => cache[chainId],
  });
};

export const useMinNominatorBond = (params: NullableMap<MinBondResourceParams>) => {
  return useResource(minBondResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: '0',
    map: (cache, { chainId }) => cache[chainId],
  });
};
