import { createEvent, createStore, createEffect, forward, sample } from 'effector';

import { CurrencyConfig, fiatService } from '@renderer/shared/api/price-provider';
import { DEFAULT_CURRENCY_SYMBOL, DEFAULT_CURRENCY_CONFIG } from '../lib/constants';

const appStarted = createEvent();

export const $currencyConfig = createStore<CurrencyConfig[]>([]);
export const $activeCurrency = createStore<CurrencyConfig | null>(null);

const $activeCurrencySymbol = createStore<CurrencyConfig['symbol'] | null>(null);

const currencyChanged = createEvent<CurrencyConfig['id']>();

const getCurrencyConfigFx = createEffect((): CurrencyConfig[] => {
  return fiatService.getCurrencyConfig(DEFAULT_CURRENCY_CONFIG);
});

const fetchCurrencyConfigFx = createEffect((): Promise<CurrencyConfig[]> => {
  return fiatService.fetchCurrencyConfig();
});

const saveCurrencyConfigFx = createEffect((config: CurrencyConfig[]) => {
  fiatService.saveCurrencyConfig(config);
});

const getActiveCurrencySymbolFx = createEffect((): string => {
  return fiatService.getActiveCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
});

const setActiveCurrencySymbolFx = createEffect((symbol: string) => {
  fiatService.saveActiveCurrencySymbol(symbol);
});

type ChangeParams = {
  id?: CurrencyConfig['id'];
  symbol?: CurrencyConfig['symbol'];
  config: CurrencyConfig[];
};
const currencyChangedFx = createEffect<ChangeParams, CurrencyConfig | undefined>(({ id, symbol, config }) => {
  return config.find((currency) => currency.id === id || currency.symbol === symbol);
});

forward({
  from: appStarted,
  to: [getActiveCurrencySymbolFx, getCurrencyConfigFx, fetchCurrencyConfigFx],
});

forward({ from: getActiveCurrencySymbolFx.doneData, to: $activeCurrencySymbol });

forward({ from: getCurrencyConfigFx.doneData, to: $currencyConfig });

forward({ from: fetchCurrencyConfigFx.doneData, to: [$currencyConfig, saveCurrencyConfigFx] });

sample({
  clock: [getCurrencyConfigFx.doneData, fetchCurrencyConfigFx.doneData],
  source: $activeCurrencySymbol,
  filter: (symbol: CurrencyConfig['symbol'] | null): symbol is CurrencyConfig['symbol'] => Boolean(symbol),
  fn: (symbol, config) => ({ symbol, config }),
  target: currencyChangedFx,
});

sample({
  clock: currencyChanged,
  source: $currencyConfig,
  fn: (config, id) => ({ config, id }),
  target: currencyChangedFx,
});

sample({
  clock: currencyChangedFx.doneData,
  filter: (newCurrency?: CurrencyConfig): newCurrency is CurrencyConfig => Boolean(newCurrency),
  target: $activeCurrency,
});

sample({
  clock: $activeCurrency,
  filter: (currency: CurrencyConfig | null): currency is CurrencyConfig => Boolean(currency),
  fn: (currency) => currency.symbol,
  target: setActiveCurrencySymbolFx,
});

export const events = {
  appStarted,
  currencyChanged,
};
