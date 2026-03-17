import { useResource } from '@/shared/query';
import { type PriceObject } from '../types';

import { type CurrentPricesParams, currentPricesResource } from './resource';

const DEFAULT_PRICES: PriceObject = {};

export const useAssetsPrices = (params: CurrentPricesParams | null): { data: PriceObject; pending: boolean } => {
  return useResource(currentPricesResource, {
    params,
    defaultValue: DEFAULT_PRICES,
    map: (cache, p) => cache[p.currency],
  });
};
