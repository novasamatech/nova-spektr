import { CurrencyItem } from '@renderer/shared/api/price-provider';

type CurrencyInfo = {
  currency: CurrencyItem;
  rate: number;
};

export const useCurrency = (currencyId: string, altCurrencyId?: string): CurrencyInfo => {
  const getCurrency = (altCurrencyId?: string): CurrencyItem => {
    return {
      code: 'USD',
      name: 'United States Dollar',
      symbol: '$',
      category: 'fiat',
      popular: true,
      id: 0,
      coingeckoId: 'usd',
    };
  };

  const getCurrencyRate = (currencyId: string, altCurrencyId?: string) => {
    // call currency provider
    return 0.5;
  };

  return {
    currency: getCurrency(currencyId),
    rate: getCurrencyRate(currencyId, altCurrencyId),
  };
};
