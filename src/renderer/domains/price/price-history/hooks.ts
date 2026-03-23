import { useResource } from '@/shared/query';
import { type PriceRange } from '../types';

import { type PriceHistoryParams, cacheKey, priceHistoryResource } from './resource';

export const usePriceHistory = (
  params: PriceHistoryParams | null,
): { data: PriceRange[] | undefined; pending: boolean } => {
  return useResource(priceHistoryResource, {
    params,
    defaultValue: undefined,
    map: (cache, p) => cache[cacheKey(p)],
  });
};
