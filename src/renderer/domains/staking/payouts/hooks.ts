import { type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import { type PayoutsResourceParams, payoutsCacheKey, payoutsResource } from './resource';
import { type UnclaimedPayouts } from './types';

const EMPTY_PAYOUTS: UnclaimedPayouts = { total: '0', payouts: [], source: 'unavailable' };

export const useUnclaimedPayouts = (params: NullableMap<PayoutsResourceParams>) => {
  return useResource(payoutsResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: EMPTY_PAYOUTS,
    map: (cache, { chainId, stash, activeEra }) => cache[payoutsCacheKey(chainId, stash, activeEra)],
  });
};
