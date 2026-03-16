import { createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { createQueryResource } from '@/shared/query';
import { type PriceObject } from '../lib/types';
import { coingeckoService } from '../service/coingeckoService';

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
    return coingeckoService.getPrice(priceIds, [currency], true);
  })
  .cache<CacheState>({
    store: $cache,
    staleAfter: STALE_AFTER_MS,
    map: (state, result, params) => ({ ...state, [params.currency]: result }),
  })
  .build();
