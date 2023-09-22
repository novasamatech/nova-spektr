import { createEvent, createStore, sample, forward } from 'effector';

import { currencyModel, priceProviderModel } from '@renderer/entities/price';
import { CurrencyItem } from '@renderer/shared/api/price-provider';

export const $activeCurrency = createStore<CurrencyItem['id']>(0);
export const $fiatFlag = createStore<boolean>(false);

const currencyChanged = createEvent<CurrencyItem['id']>();
const fiatFlagChanged = createEvent<boolean>();

const submitForm = createEvent();
const resetValues = createEvent();

// initial values
sample({
  clock: [currencyModel.$activeCurrency, resetValues],
  source: currencyModel.$activeCurrency,
  fn: (currency) => currency?.id || 0,
  target: $activeCurrency,
});

sample({
  clock: [priceProviderModel.$fiatFlag, resetValues],
  source: priceProviderModel.$fiatFlag,
  fn: Boolean,
  target: $fiatFlag,
});

// on change
forward({
  from: currencyChanged,
  to: $activeCurrency,
});

forward({
  from: fiatFlagChanged,
  to: $fiatFlag,
});

// save changes
sample({
  clock: submitForm,
  source: $activeCurrency,
  target: currencyModel.events.currencyChanged,
});

sample({
  clock: submitForm,
  source: $fiatFlag,
  target: priceProviderModel.events.fiatFlagChanged,
});

export const currencyForm = {
  $fiatFlag,
  $activeCurrency,
  events: {
    currencyChanged,
    fiatFlagChanged,
    submitForm,
    resetValues,
  },
};
