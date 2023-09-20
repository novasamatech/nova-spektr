import { coingekoService } from '../service/coingeckoService';

describe('shared/api/price-provider/coinGeckoAdapter', () => {
  test('get price-provider from coingecko', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            kusama: {
              usd: 19.24,
              usd_24h_change: -4.745815232356294,
              rub: 1813.88,
              rub_24h_change: -4.594057057555666,
            },
            polkadot: {
              usd: 4.42,
              usd_24h_change: -1.4238849671619895,
              rub: 416.81,
              rub_24h_change: -1.266834320696305,
            },
          }),
      }),
    ) as jest.Mock;

    const result = await coingekoService.getPrice(['kusama', 'polkadot'], ['usd', 'rub'], true);

    expect(result['kusama']['usd'].price).toBeDefined();
    expect(result['polkadot']['rub'].change).toBeDefined();
  });

  test('get history data from coingecko', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            prices: [
              [1692700257389, 19.114019441153435],
              [1692700503991, 19.10566535057447],
              [1692700832303, 19.10643539870203],
            ],
          }),
      }),
    ) as jest.Mock;

    const result = await coingekoService.getHistoryData('kusama', 'usd', 1692700000, 1692701000);

    expect(result.length).toEqual(3);
  });
});
