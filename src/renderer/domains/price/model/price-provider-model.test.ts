import { allSettled, fork } from 'effector';

import { networkModel } from '@/entities/network';
import { type CurrencyItem, type PriceObject } from '../types';

import { currencyModel } from './currency-model';
import { priceProviderModel } from './price-provider-model';

function mockFetchJson(data: unknown) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(data) })) as jest.Mock;
}

describe('priceProviderModel', () => {
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

  test('should change $fiatFlag when fiatFlagChanged', async () => {
    const scope = fork();
    await allSettled(priceProviderModel.events.fiatFlagChanged, { scope, params: false });
    expect(scope.getState(priceProviderModel.$fiatFlag)).toBe(false);
  });

  test('should update $assetPrices when currencyChanged', async () => {
    mockFetchJson({
      kusama: { usd: 19.24, usd_24h_change: -4.745815232356294 },
    });

    const scope = fork({
      values: new Map()
        .set(networkModel.$chains, {
          '0x123': {
            chainId: '0x123',
            name: 'Test Chain',
            assets: [{ priceId: 'kusama' }],
          },
        })
        .set(currencyModel.$currencyConfig, config),
    });

    await allSettled(currencyModel.events.currencyChanged, { scope, params: 0 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual(prices);

    mockFetchJson({
      kusama: { eur: 11.1, eur_24h_change: 22.2 },
    });
    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(priceProviderModel.$assetsPrices)).toEqual({
      kusama: {
        eur: { price: 11.1, change: 22.2 },
      },
    });
  });

  test('should not fetch prices when chains store is empty', async () => {
    mockFetchJson({});

    const scope = fork({
      values: new Map().set(networkModel.$chains, {}).set(currencyModel.$currencyConfig, config),
    });

    await allSettled(currencyModel.events.currencyChanged, { scope, params: 1 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('should fetch prices with correct params when chains has assets', async () => {
    mockFetchJson({});

    const mockChain = {
      chainId: '0x123',
      name: 'Test Chain',
      assets: [{ priceId: 'kusama' }, { priceId: 'polkadot' }, { priceId: null }],
    };

    const gbpConfig: CurrencyItem[] = [
      ...config,
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        category: 'fiat',
        popular: false,
        id: 2,
        coingeckoId: 'gbp',
      },
    ];

    const scope = fork({
      values: new Map().set(networkModel.$chains, { '0x123': mockChain }).set(currencyModel.$currencyConfig, gbpConfig),
    });

    await allSettled(currencyModel.events.currencyChanged, { scope, params: 2 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as URL;
    const params = new URLSearchParams(calledUrl.search);
    expect(params.get('ids')).toBe('kusama,polkadot');
    expect(params.get('vs_currencies')).toBe('gbp');
    expect(params.get('include_24hr_change')).toBe('true');
  });
});
