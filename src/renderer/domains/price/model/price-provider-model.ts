import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { nonNullable } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { type CurrentPricesParams, currentPricesResource } from '../current-prices/resource';
import { DEFAULT_FIAT_FLAG, DEFAULT_FIAT_PROVIDER, FIAT_FLAG_KEY, PRICE_PROVIDER_KEY } from '../lib/constants';
import { type PriceApiProvider, type PriceObject } from '../lib/types';

import { currencyModel } from './currency-model';

const $fiatFlag = createStore<boolean>(DEFAULT_FIAT_FLAG);
const $priceProvider = createStore<PriceApiProvider>(DEFAULT_FIAT_PROVIDER);

persist({ key: FIAT_FLAG_KEY, store: $fiatFlag, sync: true });
persist({ key: PRICE_PROVIDER_KEY, store: $priceProvider, sync: true });

const fiatFlagChanged = createEvent<boolean>();
const priceProviderChanged = createEvent<PriceApiProvider>();

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
    if (!currency) return {};

    return cache[currency.coingeckoId] ?? {};
  },
);

sample({
  source: $currentPricesParams,
  filter: nonNullable,
  target: currentPricesResource.start,
});

sample({
  clock: fiatFlagChanged,
  target: $fiatFlag,
});

sample({
  clock: priceProviderChanged,
  target: $priceProvider,
});

export const priceProviderModel = {
  $fiatFlag,
  $priceProvider,
  $assetsPrices,
  $currentPricesParams,
  events: {
    fiatFlagChanged,
    priceProviderChanged,
  },
  output: {
    fiatFlagChangedDone: fiatFlagChanged,
    fiatFlagChangedFail: fiatFlagChanged,
  },
};
