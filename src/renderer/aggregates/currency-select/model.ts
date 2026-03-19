import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import CURRENCY from '@/shared/config/currency/currencies.json';
import { nonNullable } from '@/shared/lib/utils';
import { type CurrencyItem, type CurrentPricesParams, type PriceObject, currentPricesResource } from '@/domains/price';
import { networkModel } from '@/entities/network';

const CURRENCY_CODE_KEY = 'currency_code';
const DEFAULT_CURRENCY_CODE = 'usd';
const FIAT_FLAG_KEY = 'fiat_flag';
const DEFAULT_FIAT_FLAG = true;

const EMPTY_PRICES: PriceObject = {};

// Currency preference

const $currencyConfig = createStore<CurrencyItem[]>(CURRENCY as CurrencyItem[]);

const $activeCurrencyCode = createStore<string>(DEFAULT_CURRENCY_CODE);

persist({
  key: CURRENCY_CODE_KEY,
  store: $activeCurrencyCode,
  sync: true,
});

const currencyChanged = createEvent<CurrencyItem['id']>();

const $activeCurrency = combine($activeCurrencyCode, $currencyConfig, (code, config) => {
  return config.find(c => c.code.toLowerCase() === code.toLowerCase()) ?? null;
});

sample({
  clock: currencyChanged,
  source: $currencyConfig,
  fn: (config, id) => {
    const found = config.find(c => c.id === id);

    return found?.code.toLowerCase() ?? DEFAULT_CURRENCY_CODE;
  },
  target: $activeCurrencyCode,
});

// Fiat flag

const $fiatFlag = createStore<boolean>(DEFAULT_FIAT_FLAG);

persist({ key: FIAT_FLAG_KEY, store: $fiatFlag, sync: true });

const fiatFlagChanged = createEvent<boolean>();

sample({
  clock: fiatFlagChanged,
  target: $fiatFlag,
});

// Orchestration

const $currentPricesParams = combine(
  networkModel.$chains,
  $activeCurrency,
  (chains, currency): CurrentPricesParams | null => {
    if (!currency) return null;

    const priceIds = Object.values(chains).flatMap(chain =>
      chain.assets.map(asset => asset.priceId).filter(nonNullable),
    );
    if (priceIds.length === 0) return null;

    return { priceIds, currency: currency.coingeckoId };
  },
);

const $assetsPrices = combine(currentPricesResource.$cache, $activeCurrency, (cache, currency): PriceObject => {
  if (!currency) return EMPTY_PRICES;

  return cache[currency.coingeckoId] ?? EMPTY_PRICES;
});

sample({
  source: $currentPricesParams,
  filter: nonNullable,
  target: currentPricesResource.fetch,
});

export const currencySelect = {
  $currencyConfig,
  $activeCurrency,
  $fiatFlag,
  $assetsPrices,
  $currentPricesParams,
  events: {
    currencyChanged,
    fiatFlagChanged,
  },
  output: {
    currencyChanged: $activeCurrencyCode.updates,
  },
};
