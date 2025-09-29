import { allSettled, fork } from 'effector';

import { type CurrencyItem, type PriceObject, coingekoService, fiatService } from '@/shared/api/price-provider';
import { kernelModel } from '@/shared/core';
import { networkModel } from '@/entities/network';
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

  test('should update $assetPrices when currencyChanged', async () => {
    const newPrices = {
      kusama: {
        eur: { price: 11.1, change: 22.2 },
      },
    };

    const scope = fork({
      values: new Map()
        .set(priceProviderModel.$assetsPrices, prices)
        .set(networkModel.$chains, {
          '0x123': {
            chainId: '0x123',
            name: 'Test Chain',
            assets: [{ priceId: 'kusama' }],
          },
        })
        .set(currencyModel.$currencyConfig, config)
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO),
    });

    jest.spyOn(coingekoService, 'getPrice').mockResolvedValue(prices);
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 0 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);

    jest.spyOn(coingekoService, 'getPrice').mockResolvedValue(newPrices);
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(newPrices);
  });

  test('should not call fetchAssetsPricesFx when chains store is empty', async () => {
    const getPrice = jest.spyOn(coingekoService, 'getPrice').mockResolvedValue({});

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {}) // Empty chains object
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO)
        .set(currencyModel.$currencyConfig, config),
    });

    // Trigger currency change to potentially fire the sample
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });

    // fetchAssetsPricesFx should not be called because chains is empty
    expect(getPrice).not.toHaveBeenCalled();
  });

  test('should call fetchAssetsPricesFx with correct params when chains has assets', async () => {
    const getPrice = jest.spyOn(coingekoService, 'getPrice').mockResolvedValue({});

    const mockChain = {
      chainId: '0x123',
      name: 'Test Chain',
      assets: [
        { priceId: 'kusama' },
        { priceId: 'polkadot' },
        { priceId: null }, // Should be filtered out
      ],
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { '0x123': mockChain })
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO)
        .set(currencyModel.$currencyConfig, config),
    });

    // Trigger currency change to fire the sample
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });

    // fetchAssetsPricesFx should be called with filtered priceIds
    expect(getPrice).toHaveBeenCalledWith(
      ['kusama', 'polkadot'], // Only non-null priceIds
      ['eur'], // EUR currency coingeckoId (config[1])
      true, // includeRates
    );
  });
});
