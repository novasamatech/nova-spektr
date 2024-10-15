import { attach, combine, createApi, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { combineEvents, spread } from 'patronum';

import { type CurrencyItem } from '@/shared/api/price-provider';
import { currencyModel, priceProviderModel } from '@/entities/price';

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

const $cryptoCurrencies = currencyModel.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'crypto');
});
const $popularFiatCurrencies = currencyModel.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'fiat' && c.popular);
});
const $unpopularFiatCurrencies = currencyModel.$currencyConfig.map((config) => {
  return config.filter((c) => c.category === 'fiat' && !c.popular);
});

const $isFormValid = combine(
  {
    isCurrencyDirty: $currencyForm.fields.currency.$isDirty,
    isFiatFlagDirty: $currencyForm.fields.fiatFlag.$isDirty,
  },
  ({ isCurrencyDirty, isFiatFlagDirty }) => isFiatFlagDirty || isCurrencyDirty,
);

type Params = {
  fiatFlag: boolean | null;
  currency: CurrencyItem | null;
};

sample({
  clock: [priceProviderModel.output.fiatFlagLoaded, currencyModel.output.activeCurrencyLoaded, formInitiated],
  source: {
    fiatFlag: priceProviderModel.$fiatFlag,
    currency: currencyModel.$activeCurrency,
  },
  fn: ({ fiatFlag, currency }: Params) => ({ fiatFlag: Boolean(fiatFlag), currency: currency?.id || 0 }),
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
      fiatFlag: priceProviderModel.events.fiatFlagChanged,
      currency: currencyModel.events.currencyChanged,
    },
  }),
});

sample({
  clock: combineEvents({
    events: [priceProviderModel.output.fiatFlagChangedDone, currencyModel.output.currencyChangedDone],
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
