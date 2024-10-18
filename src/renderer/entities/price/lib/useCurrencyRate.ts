import { useUnit } from 'effector-react';

import { currencyModel } from '../model/currency-model';
import { priceProviderModel } from '../model/price-provider-model';

export const useCurrencyRate = (assetId?: string, showCurrency?: boolean): number | null => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeCurrency = useUnit(currencyModel.$activeCurrency);
  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);

  if (
    !showCurrency ||
    !fiatFlag ||
    !activeCurrency ||
    !assetsPrices ||
    !assetId ||
    !assetsPrices[assetId] ||
    !assetsPrices[assetId][activeCurrency.coingeckoId]
  )
    return null;

  return assetsPrices[assetId][activeCurrency.coingeckoId].price;
};
