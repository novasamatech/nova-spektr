import { convertPriceToObjectView, convertPriceToDBView, getCurrencyChangeKey } from '../lib/utils';

describe('shared/api/price-provider/lib/utils', () => {
  test('get correct change key', () => {
    const result = getCurrencyChangeKey('polkadot');

    expect(result).toEqual('polkadot_24h_change');
  });

  test('convert price from object to array', () => {
    const result = convertPriceToDBView({
      kusama: {
        usd: {
          price: 19.06,
          change: -5.22061353514796,
        },
        rub: {
          price: 1795.2,
          change: -5.284952983744856,
        },
      },
      polkadot: {
        usd: {
          price: 4.39,
          change: -1.8926089775953392,
        },
        rub: {
          price: 413.87,
          change: -1.9592075880855542,
        },
      },
    });

    expect(result.length).toEqual(4);
  });

  test('convert price from array to object', () => {
    const result = convertPriceToObjectView([
      { assetId: 'kusama', currency: 'usd', price: 19.06, change: -5.22061353514796 },
      { assetId: 'kusama', currency: 'rub', price: 1795.2, change: -5.284952983744856 },
      { assetId: 'polkadot', currency: 'usd', price: 4.39, change: -1.8926089775953392 },
      { assetId: 'polkadot', currency: 'rub', price: 413.87, change: -1.9592075880855542 },
    ]);

    expect(result['kusama']['usd'].price).toEqual(19.06);
    expect(result['polkadot']['rub'].change).toEqual(-1.9592075880855542);
  });
});
