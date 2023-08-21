import { AssetId, Currency, PriceObject, PriceAdapter, PriceItem, PriceRange } from '../common/types';
import { getCurrencyChangeTitle } from '../common/utils';
import { COINGECKO_URL } from './consts';

export class CoinGeckoAdapter implements PriceAdapter {
  async getPrice(ids: AssetId[], currencies: Currency[], includeRateChange: boolean): Promise<PriceObject> {
    const response = await fetch(`${COINGECKO_URL}/simple/price`, {
      method: 'GET',
      body: JSON.stringify({
        ids: ids.join(','),
        vs_currencies: currencies.join(','),
        include_24hr_change: includeRateChange ? 'true' : 'false',
      }),
    });

    const data = await response.json();

    const result = ids.reduce<PriceObject>((result, assetId) => {
      result[assetId] = currencies.reduce<Record<string, PriceItem>>((result, currency) => {
        result[currency] = {
          price: data[assetId][currency],
          change: data[assetId][getCurrencyChangeTitle(currency)],
        };

        return result;
      }, {});

      return result;
    }, {});

    return result;
  }

  async getHistoryData(id: string, currency: string, from: number, to: number): Promise<PriceRange[]> {
    const response = await fetch(`${COINGECKO_URL}/coins/${id}/market_chart/range`, {
      method: 'GET',
      body: JSON.stringify({
        vs_currency: currency,
        from,
        to,
      }),
    });

    const data = await response.json();

    return data.prices;
  }
}
