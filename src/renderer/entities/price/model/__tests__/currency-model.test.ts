import { allSettled, fork } from 'effector';

import { type CurrencyItem, fiatService } from '@/shared/api/price-provider';
import { kernelModel } from '@/shared/core';
import { currencyModel } from '../currency-model';

describe('entities/price/model/currency-model', () => {
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should setup $currencyConfig on app start', async () => {
    jest.spyOn(fiatService, 'getCurrencyConfig').mockReturnValue(config);

    const scope = fork();
    expect(scope.getState(currencyModel.$currencyConfig)).toEqual([]);
    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(currencyModel.$currencyConfig)).toEqual(config);
  });

  test('should setup $activeCurrency on app start', async () => {
    jest.spyOn(fiatService, 'getCurrencyConfig').mockReturnValue(config);
    jest.spyOn(fiatService, 'getActiveCurrencyCode').mockReturnValue('usd');

    const scope = fork();
    expect(scope.getState(currencyModel.$activeCurrency)).toBeNull();
    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(currencyModel.$activeCurrency)).toEqual(config[1]);
  });

  test('should change $activeCurrency when currencyChanged', async () => {
    jest.spyOn(fiatService, 'getCurrencyConfig').mockReturnValue(config);

    const scope = fork();
    await allSettled(kernelModel.events.appStarted, { scope });
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(currencyModel.$activeCurrency)).toEqual(config[0]);
  });
});
