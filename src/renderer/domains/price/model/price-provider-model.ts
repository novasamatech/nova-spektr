import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { DEFAULT_FIAT_FLAG, FIAT_FLAG_KEY } from '../constants';
import { type CurrentPricesParams, currentPricesResource } from '../current-prices/resource';
import { type PriceObject } from '../types';

import { currencyModel } from './currency-model';

const EMPTY_PRICES: PriceObject = {};

const $fiatFlag = createStore<boolean>(DEFAULT_FIAT_FLAG);

persist({ key: FIAT_FLAG_KEY, store: $fiatFlag, sync: true });

const fiatFlagChanged = createEvent<boolean>();

const $currentPricesParams = combine(
  networkModel.$chains,
  currencyModel.$activeCurrency,
  (chains, currency): CurrentPricesParams | null => {
    if (!currency) return null;

    const priceIds = Object.values(chains).flatMap(chain =>
      chain.assets.map(asset => asset.priceId).filter(nonNullable),
    );
    if (priceIds.length === 0) return null;

    return { priceIds, currency: currency.coingeckoId };
  },
);

const $assetsPrices = combine(
  currentPricesResource.$cache,
  currencyModel.$activeCurrency,
  (cache, currency): PriceObject => {
    if (!currency) return EMPTY_PRICES;

    return cache[currency.coingeckoId] ?? EMPTY_PRICES;
  },
);

sample({
  source: $currentPricesParams,
  filter: nonNullable,
  target: currentPricesResource.fetch,
});

sample({
  clock: fiatFlagChanged,
  target: $fiatFlag,
});

export const priceProviderModel = {
  $fiatFlag,
  $assetsPrices,
  $currentPricesParams,
  events: {
    fiatFlagChanged,
  },
};
