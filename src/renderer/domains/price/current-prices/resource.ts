import { createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { createQueryResource } from '@/shared/query';
import { COINGECKO_URL } from '../constants';
import { type PriceItem, type PriceObject } from '../types';

export type CurrentPricesParams = {
  priceIds: string[];
  currency: string;
};

const STALE_AFTER_MS = 5 * 60 * 1000;

type CacheState = Record<string, PriceObject>;

const $cache = createStore<CacheState>({});

persist({ key: 'current_prices_cache', store: $cache, sync: true });

export const currentPricesResource = createQueryResource<CurrentPricesParams>({
  key: ({ currency }) => currency,
})
  .name('current-prices')
  .request<PriceObject>(async ({ priceIds, currency }) => {
    const url = new URL(`${COINGECKO_URL}/simple/price`);
    url.search = new URLSearchParams({
      ids: priceIds.join(','),
      vs_currencies: currency,
      include_24hr_change: 'true',
    }).toString();

    const response = await fetch(url);
    const data = await response.json();

    return priceIds.reduce<PriceObject>((acc, assetId) => {
      acc[assetId] = {
        [currency]: {
          price: data[assetId][currency],
          change: data[assetId][`${currency}_24h_change`],
        } satisfies PriceItem,
      };

      return acc;
    }, {});
  })
  .cache<CacheState>({
    store: $cache,
    staleAfter: STALE_AFTER_MS,
    map: (state, result, params) => ({ ...state, [params.currency]: result }),
  })
  .build();
