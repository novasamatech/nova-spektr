import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import CURRENCY from '@/shared/config/currency/currencies.json';
import { CURRENCY_CODE_KEY, DEFAULT_CURRENCY_CODE } from '../lib/constants';
import { type CurrencyItem } from '../lib/types';

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

export const currencyModel = {
  $currencyConfig,
  $activeCurrency,
  events: {
    currencyChanged,
  },
  output: {
    currencyChangedDone: $activeCurrencyCode.updates,
    currencyChangedFail: $activeCurrencyCode.updates,
  },
};
