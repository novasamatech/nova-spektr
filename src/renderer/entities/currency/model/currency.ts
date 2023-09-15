import { createEffect, createEvent, createStore, forward } from 'effector';

import type { Currency } from './types';

const CURRENCY_KEY = 'currency';

const CURRENCIES = require('@renderer/widgets/SelectCurrencyModal/temp/mock-currencies.json');

export const $currency = createStore<Currency | null>(null);
const appStarted = createEvent();
const updateCurrency = createEvent<Currency | null>();

const loadSetCurrencyFx = createEffect(() => {
  // load from local storage
  const currencyId = localStorage.getItem(CURRENCY_KEY);
  console.log('currencyId: ', currencyId);

  // currency display turned off
  if (currencyId === 'null') {
    return null;
  }

  // currency not set. Set usd as default
  if (!currencyId) {
    return CURRENCIES.find((c: Currency) => c.coingeckoId === 'usd');
  }

  return CURRENCIES.find((c: Currency) => c.coingeckoId === currencyId);
});

const updateCurrencyFx = createEffect(async (currency: Currency | null) => {
  localStorage.setItem(CURRENCY_KEY, currency ? currency.coingeckoId : 'null');

  return currency;
});

$currency
  .on(loadSetCurrencyFx.doneData, (_, currency) => {
    return currency;
  })
  .on(updateCurrencyFx.doneData, (_, currency) => {
    return currency;
  });

forward({
  from: appStarted,
  to: loadSetCurrencyFx,
});

forward({
  from: updateCurrency,
  to: updateCurrencyFx,
});

export const events = {
  appStarted,
  updateCurrency,
};
