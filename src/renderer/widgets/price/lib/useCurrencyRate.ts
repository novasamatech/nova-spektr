import { useUnit } from 'effector-react';

import { currencyModel, priceProviderModel, useAssetsPrices } from '@/domains/price';

export const useCurrencyRate = (assetId?: string, showCurrency?: boolean): number | null => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const activeCurrency = useUnit(currencyModel.$activeCurrency);
  const { data: assetsPrices } = useAssetsPrices(activeCurrency?.coingeckoId ?? null);

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
