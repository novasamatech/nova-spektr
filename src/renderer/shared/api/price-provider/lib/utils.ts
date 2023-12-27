import { PriceObject, PriceDB } from './types';

export function getCurrencyChangeKey(currency: string): string {
  return `${currency}_24h_change`;
}

export function convertPriceToDBView(price: PriceObject): PriceDB[] {
  const priceDB: PriceDB[] = [];

  Object.entries(price).forEach(([assetId, assetPrice]) => {
    Object.entries(assetPrice).forEach(([currency, { price, change }]) => {
      priceDB.push({
        assetId,
        currency,
        price,
        change,
      });
    });
  });

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
