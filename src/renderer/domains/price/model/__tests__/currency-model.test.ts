import { allSettled, fork } from 'effector';

import { type CurrencyItem } from '../../lib/types';
import { currencyModel } from '../currency-model';

describe('domains/price/model/currency-model', () => {
  const config: CurrencyItem[] = [
    {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      category: 'fiat',
      popular: true,
      id: 1,
      coingeckoId: 'eur',
    },
    {
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
      category: 'fiat',
      popular: true,
      id: 0,
      coingeckoId: 'usd',
    },
  ];

  test('should have $currencyConfig populated from JSON', () => {
    const scope = fork();
    const currencyConfig = scope.getState(currencyModel.$currencyConfig);
    expect(currencyConfig.length).toBeGreaterThan(0);
  });

  test('should derive $activeCurrency from $currencyConfig and default code', () => {
    const scope = fork({
      values: new Map().set(currencyModel.$currencyConfig, config),
    });

    const activeCurrency = scope.getState(currencyModel.$activeCurrency);
    expect(activeCurrency).toEqual(config[1]); // USD is default
  });

  test('should change $activeCurrency when currencyChanged', async () => {
    const scope = fork({
      values: new Map().set(currencyModel.$currencyConfig, config),
    });

    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(currencyModel.$activeCurrency)).toEqual(config[0]); // EUR (id: 1)
  });
});
