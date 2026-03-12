import { createStore } from 'effector';

import { type PriceRange, coingekoService } from '@/shared/api/price-provider';
import { createQueryResource } from '@/shared/query';

export type TimeRange = '7d' | '30d' | '90d';

export type PriceHistoryParams = {
  assetId: string;
  currency: string;
  range: TimeRange;
};

const RANGE_DAYS: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90 };
const STALE_AFTER_MS = 5 * 60 * 1000;

function cacheKey({ assetId, currency, range }: PriceHistoryParams): string {
  return `${assetId}:${currency}:${range}`;
}

type CacheState = Record<string, PriceRange[]>;

export const priceHistoryResource = createQueryResource<PriceHistoryParams>({
  key: params => cacheKey(params),
})
  .name('price-history')
  .request<PriceRange[]>(async ({ assetId, currency, range }) => {
    const days = RANGE_DAYS[range];
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 24 * 60 * 60;

    return coingekoService.getHistoryData(assetId, currency, from, to);
  })
  .cache<CacheState>({
    store: createStore<CacheState>({}),
    staleAfter: STALE_AFTER_MS,
    map: (state, result, params) => ({ ...state, [cacheKey(params)]: result }),
  })
  .build();
