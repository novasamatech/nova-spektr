import { allSettled, fork } from 'effector';

import { type CurrencyItem, type PriceObject } from '@/domains/price';
import { networkModel } from '@/entities/network';

import { currencySelect } from './model';

function mockFetchJson(data: unknown) {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(data) })) as jest.Mock;
}

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

describe('currencySelect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should have $currencyConfig populated from JSON', () => {
    const scope = fork();
    const currencyConfig = scope.getState(currencySelect.$currencyConfig);
    expect(currencyConfig.length).toBeGreaterThan(0);
  });

  test('should derive $activeCurrency from $currencyConfig and default code', () => {
    const scope = fork({
      values: new Map().set(currencySelect.$currencyConfig, config),
    });

    const activeCurrency = scope.getState(currencySelect.$activeCurrency);
    expect(activeCurrency).toEqual(config[1]); // USD is default
  });

  test('should change $activeCurrency when currencyChanged', async () => {
    const scope = fork({
      values: new Map().set(currencySelect.$currencyConfig, config),
    });

    await allSettled(currencySelect.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(currencySelect.$activeCurrency)).toEqual(config[0]); // EUR (id: 1)
  });

  test('should have default $fiatFlag as true', () => {
    const scope = fork();
    expect(scope.getState(currencySelect.$fiatFlag)).toBe(true);
  });

  test('should change $fiatFlag when fiatFlagChanged', async () => {
    const scope = fork();
    await allSettled(currencySelect.events.fiatFlagChanged, { scope, params: false });
    expect(scope.getState(currencySelect.$fiatFlag)).toBe(false);
  });

  test('should update $assetPrices when currencyChanged', async () => {
    const prices: PriceObject = {
      kusama: {
        usd: { price: 19.24, change: -4.745815232356294 },
      },
    };

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
        .set(currencySelect.$currencyConfig, config),
    });

    await allSettled(currencySelect.events.currencyChanged, { scope, params: 0 });
    expect(scope.getState(currencySelect.$assetsPrices)).toEqual(prices);

    mockFetchJson({
      kusama: { eur: 11.1, eur_24h_change: 22.2 },
    });
    await allSettled(currencySelect.events.currencyChanged, { scope, params: 1 });
    expect(scope.getState(currencySelect.$assetsPrices)).toEqual({
      kusama: {
        eur: { price: 11.1, change: 22.2 },
      },
    });
  });

  test('should not fetch prices when chains store is empty', async () => {
    mockFetchJson({});

    const scope = fork({
      values: new Map().set(networkModel.$chains, {}).set(currencySelect.$currencyConfig, config),
    });

    await allSettled(currencySelect.events.currencyChanged, { scope, params: 1 });
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
      values: new Map()
        .set(networkModel.$chains, { '0x123': mockChain })
        .set(currencySelect.$currencyConfig, gbpConfig),
    });

    await allSettled(currencySelect.events.currencyChanged, { scope, params: 2 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as URL;
    const params = new URLSearchParams(calledUrl.search);
    expect(params.get('ids')).toBe('kusama,polkadot');
    expect(params.get('vs_currencies')).toBe('gbp');
    expect(params.get('include_24hr_change')).toBe('true');
  });
});
