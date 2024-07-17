import {
  type AssetId,
  type Currency,
  type PriceAdapter,
  type PriceItem,
  type PriceObject,
  type PriceRange,
} from '../lib/types';
import { getCurrencyChangeKey } from '../lib/utils';
import { COINGECKO_URL } from '../lib/constants';

export const coingekoService: PriceAdapter = {
  getPrice,
  getHistoryData,
};

async function getPrice(ids: AssetId[], currencies: Currency[], includeRateChange: boolean): Promise<PriceObject> {
  const url = new URL(`${COINGECKO_URL}/simple/price`);
  url.search = new URLSearchParams({
    ids: ids.join(','),
    vs_currencies: currencies.join(','),
    include_24hr_change: includeRateChange.toString(),
  }).toString();

  const response = await fetch(url);
  const data = await response.json();

  return ids.reduce<PriceObject>((acc, assetId) => {
    acc[assetId] = currencies.reduce<Record<string, PriceItem>>((accPrice, currency) => {
      accPrice[currency] = {
        price: data[assetId][currency],
        change: data[assetId][getCurrencyChangeKey(currency)],
      };

      return accPrice;
    }, {});

    return acc;
  }, {});
}

async function getHistoryData(id: string, currency: string, from: number, to: number): Promise<PriceRange[]> {
  const url = new URL(`${COINGECKO_URL}/coins/${id}/market_chart/range`);
  url.search = new URLSearchParams({
    vs_currency: currency,
    from: from.toString(),
    to: to.toString(),
  }).toString();

  const response = await fetch(url);
  const data = await response.json();

  return data.prices;
}
