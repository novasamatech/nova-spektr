import { CoinGeckoAdapter } from './CoingeckoAdapter';

describe('api/price/coingecko/CoinGeckoAdapter', () => {
  test('get price from coingecko', async () => {
    const adapter = new CoinGeckoAdapter();

    const result = await adapter.getPrice(['kusama', 'polkadot'], ['usd', 'rub'], true);

    expect(result['kusama']['usd'].price).toBeDefined();
    expect(result['polkadot']['rub'].change).toBeDefined();
  });

  test('get price from coingecko', async () => {
    const adapter = new CoinGeckoAdapter();

    const result = await adapter.getHistoryData('kusama', 'usd', 1692700000, 1692701000);

    expect(result.length).toBe(3);
  });
});
