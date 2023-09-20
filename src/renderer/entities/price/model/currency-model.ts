import { createEvent, createStore, createEffect, forward, sample } from 'effector';

import { kernelModel } from '@renderer/shared/core';
import { CurrencyConfig, fiatService } from '@renderer/shared/api/price-provider';
import { DEFAULT_CURRENCY_CODE, DEFAULT_CURRENCY_CONFIG } from '../lib/constants';

export const $currencyConfig = createStore<CurrencyConfig[]>([]);
export const $activeCurrency = createStore<CurrencyConfig | null>(null);

const $activeCurrencyCode = createStore<CurrencyConfig['code'] | null>(null);

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

const getActiveCurrencyCodeFx = createEffect((): string => {
  return fiatService.getActiveCurrencyCode(DEFAULT_CURRENCY_CODE);
});

const saveActiveCurrencyCodeFx = createEffect((currency: CurrencyConfig) => {
  fiatService.saveActiveCurrencyCode(currency.code);
});

type ChangeParams = {
  id?: CurrencyConfig['id'];
  code?: CurrencyConfig['code'];
  config: CurrencyConfig[];
};
const currencyChangedFx = createEffect<ChangeParams, CurrencyConfig | undefined>(({ id, code, config }) => {
  return config.find((currency) => {
    const hasId = currency.id === id;
    const hasCode = currency.code.toLowerCase() === code?.toLowerCase();

    return hasId || hasCode;
  });
});

forward({
  from: kernelModel.events.appStarted,
  to: [getActiveCurrencyCodeFx, getCurrencyConfigFx, fetchCurrencyConfigFx],
});

forward({ from: getActiveCurrencyCodeFx.doneData, to: $activeCurrencyCode });

forward({ from: getCurrencyConfigFx.doneData, to: $currencyConfig });

forward({ from: fetchCurrencyConfigFx.doneData, to: [$currencyConfig, saveCurrencyConfigFx] });

sample({
  clock: [getCurrencyConfigFx.doneData, fetchCurrencyConfigFx.doneData],
  source: $activeCurrencyCode,
  filter: (code: CurrencyConfig['code'] | null): code is CurrencyConfig['code'] => Boolean(code),
  fn: (code, config) => ({ code, config }),
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
  source: $activeCurrency,
  filter: (prev, next) => prev?.id !== next?.id,
  fn: (_, next) => next!,
  target: [$activeCurrency, saveActiveCurrencyCodeFx],
});

export const events = {
  currencyChanged,
};
