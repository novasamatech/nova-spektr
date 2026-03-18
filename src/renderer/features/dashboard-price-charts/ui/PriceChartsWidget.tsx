import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { IconButton, TitleText } from '@/shared/ui';
import { useAssetsPrices } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';
import { type TrackedAssetInfo } from '../hooks/useAvailableAssets';
import { useTrackedAssets } from '../hooks/useTrackedAssets';

import { PriceChartModal } from './PriceChartModal';
import { PriceTile } from './PriceTile';
import { TokenSelectionModal } from './TokenSelectionModal';

export const PriceChartsWidget = () => {
  const { t } = useI18n();
  const [selectedAsset, setSelectedAsset] = useState<TrackedAssetInfo | null>(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: allPrices, pending } = useAssetsPrices(pricesParams);
  const { trackedAssets } = useTrackedAssets();

  const prices = useMemo(() => {
    if (!allPrices || !currency) return {};

    const result: Record<string, { price: number; change: number }> = {};
    for (const asset of trackedAssets) {
      const assetPrices = allPrices[asset.priceId];
      if (assetPrices) {
        const priceItem = assetPrices[currency.coingeckoId];
        if (priceItem) {
          result[asset.priceId] = priceItem;
        }
      }
    }

    return result;
  }, [allPrices, currency, trackedAssets]);

  if (!fiatFlag || !currency) return null;

  const currencySymbol = currency.symbol ?? currency.code;

  return (
    <div className="flex w-[560px] flex-col gap-3">
      <div className="flex items-center gap-2">
        <TitleText>{t('dashboard.priceCharts.title')}</TitleText>
        <IconButton name="settingsLite" size={16} onClick={() => setShowTokenSelector(true)} />
      </div>

      {trackedAssets.length === 0 ? (
        <p className="text-footnote text-text-tertiary">{t('dashboard.priceCharts.emptyState')}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {trackedAssets.map((asset, index) => (
            <PriceTile
              key={asset.priceId}
              asset={asset}
              index={index}
              price={prices[asset.priceId] ?? null}
              currencySymbol={currencySymbol}
              pending={pending}
              onClick={() => setSelectedAsset(asset)}
            />
          ))}
        </div>
      )}

      {selectedAsset && (
        <PriceChartModal
          asset={selectedAsset}
          currency={currency}
          currentPrice={prices[selectedAsset.priceId] ?? null}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {showTokenSelector && <TokenSelectionModal onClose={() => setShowTokenSelector(false)} />}
    </div>
  );
};
