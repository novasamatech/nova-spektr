import { useUnit } from 'effector-react';

import { useAssetsPrices } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';

export const useCurrencyRate = (assetId?: string, showCurrency?: boolean): number | null => {
  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: assetsPrices } = useAssetsPrices(pricesParams);

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

  return assetsPrices[assetId]![activeCurrency.coingeckoId]!.price;
};
