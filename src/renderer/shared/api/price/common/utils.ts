import { PriceObject, PriceDB } from './types';

export const getCurrencyChangeTitle = (currency: string): string => {
  return `${currency}_24h_change`;
};

export const convertPriceToDBView = (price: PriceObject): PriceDB[] => {
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
};

export const convertPriceToObjectView = (prices: PriceDB[]): PriceObject => {
  return prices.reduce<PriceObject>((result, { assetId, currency, price, change }) => {
    result[assetId][currency] = {
      price,
      change,
    };

    return result;
  }, {});
};
