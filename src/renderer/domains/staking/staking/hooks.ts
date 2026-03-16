import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';
import { type StakingMap } from '../_lib/types';

import { type StakingResourceParams, stakingResource } from './resource';

const EMPTY_MAP: StakingMap = {};

export const useStaking = (params: NullableMap<StakingResourceParams>) => {
  return useResource(stakingResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_MAP,
    map: (cache, { chainId }) => cache[chainId] ?? EMPTY_MAP,
  });
};
