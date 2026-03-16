import { allSettled, fork } from 'effector';

import { currencySelect } from '@/aggregates/currency-select';
import { currencyFormModel } from '../currency-form';

describe('features/currency/model/currency-form', () => {
  const config = [
    { id: 0, code: 'USD', popular: true, category: 'fiat' },
    { id: 1, code: 'EUR', popular: false, category: 'fiat' },
    { id: 2, code: 'RUB', popular: true, category: 'fiat' },
    { id: 3, code: 'ETH', popular: false, category: 'crypto' },
  ];

  test('should submit new $fiatFlag & $activeCurrency', async () => {
    const scope = fork({
      values: new Map().set(currencySelect.$fiatFlag, false).set(currencySelect.$currencyConfig, config),
    });

    const { fiatFlag, currency } = currencyFormModel.$currencyForm.fields;
    await allSettled(fiatFlag.onChange, { scope, params: true });
    await allSettled(currency.onChange, { scope, params: 1 });
    await allSettled(currencyFormModel.$currencyForm.submit, { scope });

    expect(scope.getState(currencySelect.$activeCurrency)).toEqual(config[1]);
    expect(scope.getState(currencySelect.$fiatFlag)).toEqual(true);
  });

  test('should filter currencies', () => {
    const scope = fork({
      values: new Map().set(currencySelect.$currencyConfig, config),
    });

    const { $cryptoCurrencies, $popularFiatCurrencies, $unpopularFiatCurrencies } = currencyFormModel;

    expect(scope.getState($cryptoCurrencies)).toEqual([config[3]]);
    expect(scope.getState($popularFiatCurrencies)).toEqual([config[0], config[2]]);
    expect(scope.getState($unpopularFiatCurrencies)).toEqual([config[1]]);
  });

  test('should set form initial values on formInitiated event', async () => {
    const scope = fork({
      values: new Map().set(currencySelect.$fiatFlag, true).set(currencySelect.$currencyConfig, config),
    });

    await allSettled(currencySelect.events.currencyChanged, { scope, params: config[1]!.id });
    await allSettled(currencyFormModel.events.formInitiated, { scope });

    const { fiatFlag, currency } = currencyFormModel.$currencyForm.fields;

    expect(scope.getState(fiatFlag.$value)).toEqual(true);
    expect(scope.getState(currency.$value)).toEqual(config[1]!.id);
  });
});
