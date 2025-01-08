import { allSettled, fork } from 'effector';

import { type CurrencyItem, type PriceObject, coingekoService, fiatService } from '@/shared/api/price-provider';
import { kernelModel } from '@/shared/core';
import { PriceApiProvider } from '../../lib/types';
import { currencyModel } from '../currency-model';
import { priceProviderModel } from '../price-provider-model';

describe('entities/price/model/price-provider-model', () => {
  const prices: PriceObject = {
    kusama: {
      usd: { price: 19.24, change: -4.745815232356294 },
    },
  };
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

  // too expensive
  test.skip('should setup $fiatFlag on app start', async () => {
    jest.spyOn(fiatService, 'getFiatFlag').mockReturnValue(true);

    const scope = fork();
    expect(scope.getState(priceProviderModel.$fiatFlag)).toBeNull();
    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(priceProviderModel.$fiatFlag)).toEqual(true);
  });

  // too expensive
  test.skip('should setup $priceProvider on app start', async () => {
    const provider = PriceApiProvider.COINGEKO;
    jest.spyOn(fiatService, 'getPriceProvider').mockReturnValue(provider);

    const scope = fork();
    expect(scope.getState(priceProviderModel.$priceProvider)).toBeNull();
    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(priceProviderModel.$priceProvider)).toEqual(provider);
  });

  test('should setup $assetsPrices on app start', async () => {
    jest.spyOn(fiatService, 'getPriceProvider').mockReturnValue(null);
    jest.spyOn(fiatService, 'getAssetsPrices').mockReturnValue(prices);

    const scope = fork();
    expect(scope.getState(priceProviderModel.$assetsPrices)).toBeNull();
    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);
  });

  test('should change $fiatFlag when fiatFlagChanged', async () => {
    jest.spyOn(fiatService, 'getFiatFlag').mockReturnValue(true);

    const scope = fork();
    await allSettled(kernelModel.events.appStarted, { scope });
    await allSettled(priceProviderModel.events.fiatFlagChanged, { scope, params: false });
    expect(scope.getState(priceProviderModel.$fiatFlag)).toEqual(false);
  });

  test('should change $priceProvider when priceProviderChanged', async () => {
    jest.spyOn(fiatService, 'getPriceProvider').mockReturnValue(PriceApiProvider.COINGEKO);

    const scope = fork();
    await allSettled(priceProviderModel.events.priceProviderChanged, { scope, params: 'my_provider' });
    expect(scope.getState(priceProviderModel.$priceProvider)).toEqual('my_provider');
  });

  test('should fetch $assetsPrices when assetsPricesRequested', async () => {
    jest.spyOn(coingekoService, 'getPrice').mockResolvedValue(prices);

    const scope = fork({
      values: new Map()
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO)
        .set(currencyModel.$activeCurrency, 'usd'),
    });
    await allSettled(priceProviderModel.events.assetsPricesRequested, { scope, params: { includeRates: false } });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);
  });

  test('should update $assetPrices when currencyChanged', async () => {
    const newPrices = {
      kusama: {
        eur: { price: 11.1, change: 22.2 },
      },
    };
    jest.spyOn(coingekoService, 'getPrice').mockResolvedValue(newPrices);

    const scope = fork({
      values: new Map()
        .set(priceProviderModel.$assetsPrices, prices)
        .set(currencyModel.$currencyConfig, config)
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO),
    });

    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(newPrices);
  });
});
