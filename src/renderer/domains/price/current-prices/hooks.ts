import { useResource } from '@/shared/query';
import { type PriceObject } from '../lib/types';

import { type CurrentPricesParams, currentPricesResource } from './resource';

const DEFAULT_PRICES: PriceObject = {};

export const useAssetsPrices = (currency: string | null): { data: PriceObject; pending: boolean } => {
  const params: CurrentPricesParams | null = currency ? { priceIds: [], currency } : null;

  return useResource(currentPricesResource, {
    params,
    defaultValue: DEFAULT_PRICES,
    map: (cache, p) => cache[p.currency],
    filter: () => false,
  });
};
