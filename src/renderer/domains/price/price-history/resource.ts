import { createStore } from 'effector';

import { createQueryResource } from '@/shared/query';
import { COINGECKO_URL } from '../constants';
import { type PriceRange } from '../types';

export type TimeRange = '1d' | '7d' | '30d' | '90d';

export type PriceHistoryParams = {
  assetId: string;
  currency: string;
  range: TimeRange;
};

const RANGE_DAYS: Record<TimeRange, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
const STALE_AFTER_MS = 5 * 60 * 1000;

export function cacheKey({ assetId, currency, range }: PriceHistoryParams): string {
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

    const url = new URL(`${COINGECKO_URL}/coins/${assetId}/market_chart/range`);
    url.search = new URLSearchParams({
      vs_currency: currency,
      from: from.toString(),
      to: to.toString(),
    }).toString();

    const response = await fetch(url);
    const data = await response.json();

    return data.prices;
  })
  .cache<CacheState>({
    store: createStore<CacheState>({}),
    staleAfter: STALE_AFTER_MS,
    map: (state, result, params) => ({ ...state, [cacheKey(params)]: result }),
  })
  .build();
