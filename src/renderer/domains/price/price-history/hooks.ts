import { useResource } from '@/shared/query';
import { type PriceRange } from '../lib/types';

import { type PriceHistoryParams, type TimeRange, priceHistoryResource } from './resource';

export const usePriceHistory = (params: {
  assetId: string;
  currency: string | null;
  range: TimeRange;
}): { data: PriceRange[] | undefined; pending: boolean } => {
  const resourceParams: PriceHistoryParams | null = params.currency
    ? { assetId: params.assetId, currency: params.currency, range: params.range }
    : null;

  return useResource(priceHistoryResource, {
    params: resourceParams,
    defaultValue: undefined,
    map: (cache, p) => cache[`${p.assetId}:${p.currency}:${p.range}`],
  });
};
