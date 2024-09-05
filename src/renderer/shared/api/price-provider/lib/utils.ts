import { type PriceDB, type PriceObject } from './types';

export function getCurrencyChangeKey(currency: string): string {
  return `${currency}_24h_change`;
}

export function convertPriceToDBView(price: PriceObject): PriceDB[] {
  const priceDB: PriceDB[] = [];

  for (const [assetId, assetPrice] of Object.entries(price)) {
    for (const [currency, { price, change }] of Object.entries(assetPrice)) {
      priceDB.push({
        assetId,
        currency,
        price,
        change,
      });
    }
  }

  return priceDB;
}

export function convertPriceToObjectView(prices: PriceDB[]): PriceObject {
  return prices.reduce<PriceObject>((result, { assetId, currency, price, change }) => {
    if (!result[assetId]) {
      result[assetId] = {};
    }

    result[assetId][currency] = { price, change };

    return result;
  }, {});
}
