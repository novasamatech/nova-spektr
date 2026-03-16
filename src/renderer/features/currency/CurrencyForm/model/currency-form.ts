import { attach, combine, createApi, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { combineEvents, spread } from 'patronum';

import { type CurrencyItem } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const formInitiated = createEvent();

const $currencyForm = createForm({
  fields: {
    fiatFlag: { init: false },
    currency: { init: 0 as CurrencyItem['id'] },
  },
  validateOn: ['submit'],
});

const $cryptoCurrencies = currencySelect.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'crypto');
});
const $popularFiatCurrencies = currencySelect.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'fiat' && c.popular);
});
const $unpopularFiatCurrencies = currencySelect.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'fiat' && !c.popular);
});

const $isFormValid = combine(
  {
    isCurrencyDirty: $currencyForm.fields.currency.$isDirty,
    isFiatFlagDirty: $currencyForm.fields.fiatFlag.$isDirty,
  },
  ({ isCurrencyDirty, isFiatFlagDirty }) => isFiatFlagDirty || isCurrencyDirty,
);

sample({
  clock: formInitiated,
  source: {
    fiatFlag: currencySelect.$fiatFlag,
    currency: currencySelect.$activeCurrency,
  },
  fn: ({ fiatFlag, currency }) => ({ fiatFlag, currency: currency?.id || 0 }),
  target: $currencyForm.setInitialForm,
});

sample({
  clock: $currencyForm.submit,
  source: {
    fiatFlag: $currencyForm.fields.fiatFlag.$value,
    currency: $currencyForm.fields.currency.$value,
  },
  target: spread({
    targets: {
      fiatFlag: currencySelect.events.fiatFlagChanged,
      currency: currencySelect.events.currencyChanged,
    },
  }),
});

sample({
  clock: combineEvents({
    events: [currencySelect.events.fiatFlagChanged, currencySelect.output.currencyChanged],
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
  $isFormValid,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
  },
};
