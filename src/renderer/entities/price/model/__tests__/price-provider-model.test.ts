import { fork, allSettled } from 'effector';

import { kernelModel } from '@renderer/shared/core';
import { fiatService, PriceObject, coingekoService } from '@renderer/shared/api/price-provider';
import { priceProviderModel } from '../price-provider-model';
import { PriceApiProvider } from '../../lib/types';
import { currencyModel } from '../currency-model';

describe('entities/price/model/price-provider-model', () => {
  const prices: PriceObject = {
    kusama: {
      usd: { price: 19.24, change: -4.745815232356294 },
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should setup $fiatFlag on app start', async () => {
    jest.spyOn(fiatService, 'getFiatFlag').mockReturnValue(true);

    const scope = fork();
    expect(scope.getState(priceProviderModel.$fiatFlag)).toBeNull();
    await allSettled(kernelModel.events.appStarted, { scope });
    expect(scope.getState(priceProviderModel.$fiatFlag)).toEqual(true);
  });

  test('should setup $priceProvider on app start', async () => {
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
    jest.spyOn(fiatService, 'getAssetsPrices').mockReturnValue(prices);

    const scope = fork();
    await allSettled(kernelModel.events.appStarted, { scope });
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);
  });
});
