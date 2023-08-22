import { AssetId, Currency, PriceObject, PriceAdapter, PriceItem, PriceRange } from '../common/types';
import { getCurrencyChangeKey } from '../common/utils';
import { COINGECKO_URL } from './consts';

export class CoinGeckoAdapter implements PriceAdapter {
  async getPrice(ids: AssetId[], currencies: Currency[], includeRateChange: boolean): Promise<PriceObject> {
    const url = new URL(`${COINGECKO_URL}/simple/price`);
    url.search = new URLSearchParams({
      ids: ids.join(','),
      vs_currencies: currencies.join(','),
      include_24hr_change: includeRateChange ? 'true' : 'false',
    }).toString();

    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();

    const result = ids.reduce<PriceObject>((result, assetId) => {
      result[assetId] = currencies.reduce<Record<string, PriceItem>>((result, currency) => {
        result[currency] = {
          price: data[assetId][currency],
          change: data[assetId][getCurrencyChangeKey(currency)],
        };

        return result;
      }, {});

      return result;
    }, {});

    return result;
  }

  async getHistoryData(id: string, currency: string, from: number, to: number): Promise<PriceRange[]> {
    const url = new URL(`${COINGECKO_URL}/coins/${id}/market_chart/range`);
    url.search = new URLSearchParams({
      vs_currency: currency,
      from: from.toString(),
      to: to.toString(),
    }).toString();

    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();

    return data.prices;
  }
}
