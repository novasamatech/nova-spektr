import { useUnit } from 'effector-react';

import { currencyModel, priceProviderModel } from '@renderer/entities/price';

export const useCurrencyRate = (assetId?: string, showCurrency?: boolean): number | null => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeCurrency = useUnit(currencyModel.$activeCurrency);
  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);

  if (!showCurrency || !fiatFlag || !activeCurrency || !assetsPrices || !assetId) return null;

  console.log(assetsPrices);

  return assetsPrices[assetId][activeCurrency.id].price;
};
