import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';
import { type StakingResourceParams, stakingResource } from '../lib/staking-resource';
import { type StakingMap } from '../lib/types';

const EMPTY_MAP: StakingMap = {};

export const useStaking = (params: NullableMap<StakingResourceParams>) => {
  return useResource(stakingResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_MAP,
    map: (cache, { chainId }) => cache[chainId] ?? EMPTY_MAP,
  });
};
