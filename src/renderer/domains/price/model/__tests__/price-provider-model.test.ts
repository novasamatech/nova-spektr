import { allSettled, fork } from 'effector';

import { networkModel } from '@/entities/network';
import { type CurrencyItem, type PriceObject } from '../../lib/types';
import { PriceApiProvider } from '../../lib/types';
import { coingeckoService } from '../../service/coingeckoService';
import { currencyModel } from '../currency-model';
import { priceProviderModel } from '../price-provider-model';

describe('domains/price/model/price-provider-model', () => {
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

  test('should have default $fiatFlag as true', () => {
    const scope = fork();
    expect(scope.getState(priceProviderModel.$fiatFlag)).toBe(true);
  });

  test('should have default $priceProvider as COINGEKO', () => {
    const scope = fork();
    expect(scope.getState(priceProviderModel.$priceProvider)).toBe(PriceApiProvider.COINGEKO);
  });

  test('should change $fiatFlag when fiatFlagChanged', async () => {
    const scope = fork();
    await allSettled(priceProviderModel.events.fiatFlagChanged, { scope, params: false });
    expect(scope.getState(priceProviderModel.$fiatFlag)).toBe(false);
  });

  test('should change $priceProvider when priceProviderChanged', async () => {
    const scope = fork();
    await allSettled(priceProviderModel.events.priceProviderChanged, {
      scope,
      params: 'my_provider' as PriceApiProvider,
    });
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

    jest.spyOn(coingeckoService, 'getPrice').mockResolvedValue(prices);
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 0 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);

    jest.spyOn(coingeckoService, 'getPrice').mockResolvedValue(newPrices);
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(newPrices);
  });

  test('should not call fetchAssetsPricesFx when chains store is empty', async () => {
    const getPrice = jest.spyOn(coingeckoService, 'getPrice').mockResolvedValue({});

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {})
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO)
        .set(currencyModel.$currencyConfig, config),
    });

    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(getPrice).not.toHaveBeenCalled();
  });

  test('should call fetchAssetsPricesFx with correct params when chains has assets', async () => {
    const getPrice = jest.spyOn(coingeckoService, 'getPrice').mockResolvedValue({});

    const mockChain = {
      chainId: '0x123',
      name: 'Test Chain',
      assets: [{ priceId: 'kusama' }, { priceId: 'polkadot' }, { priceId: null }],
    };

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, { '0x123': mockChain })
        .set(priceProviderModel.$priceProvider, PriceApiProvider.COINGEKO)
        .set(currencyModel.$currencyConfig, config),
    });

    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });

    expect(getPrice).toHaveBeenCalledWith(['kusama', 'polkadot'], ['eur'], true);
  });
});
