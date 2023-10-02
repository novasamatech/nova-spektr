import { sample, createStore, createApi, attach, createEvent } from 'effector';
import { createForm } from 'effector-forms';
import { spread, combineEvents } from 'patronum';

import { currencyModel, priceProviderModel } from '@renderer/entities/price';
import { CurrencyItem } from '@renderer/shared/api/price-provider';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const resetForm = createEvent();

const $currencyForm = createForm({
  fields: {
    fiatFlag: { init: false },
    currency: { init: 0 as CurrencyItem['id'] },
  },
  validateOn: ['submit'],
});

const $cryptoCurrencies = currencyModel.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'crypto');
});
const $popularFiatCurrencies = currencyModel.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'fiat' && c.popular);
});
const $unpopularFiatCurrencies = currencyModel.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'fiat' && !c.popular);
});

sample({
  clock: [priceProviderModel.$fiatFlag, resetForm],
  source: priceProviderModel.$fiatFlag,
  filter: (fiatFlag): fiatFlag is boolean => fiatFlag !== null,
  target: $currencyForm.fields.fiatFlag.set,
});

sample({
  clock: [currencyModel.$activeCurrency, resetForm],
  source: currencyModel.$activeCurrency,
  filter: (currency): currency is CurrencyItem => currency !== null,
  fn: (currency) => currency!.id,
  target: $currencyForm.fields.currency.set,
});

sample({
  clock: $currencyForm.submit,
  source: {
    fiatFlag: $currencyForm.fields.fiatFlag.$value,
    currency: $currencyForm.fields.currency.$value,
  },
  target: spread({
    targets: {
      fiatFlag: priceProviderModel.events.fiatFlagChanged,
      currency: currencyModel.events.currencyChanged,
    },
  }),
});

sample({
  clock: combineEvents({
    events: [priceProviderModel.watch.fiatFlagChangedDone, currencyModel.watch.currencyChangedDone],
  }),
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

export const currencyFormModel = {
  $currencyForm,
  $cryptoCurrencies,
  $popularFiatCurrencies,
  $unpopularFiatCurrencies,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    resetForm,
  },
};
