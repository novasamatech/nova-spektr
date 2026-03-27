import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { IconButton, TitleText } from '@/shared/ui';
import { useAssetsPrices } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';
import { DashboardWidget } from '@/pages/Dashboard';
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

  const openTokenSelector = useCallback(() => setShowTokenSelector(true), []);
  const closeTokenSelector = useCallback(() => setShowTokenSelector(false), []);
  const closeChart = useCallback(() => setSelectedAsset(null), []);

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
    <DashboardWidget card={false} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TitleText>{t('dashboard.priceCharts.title')}</TitleText>
        <IconButton name="settingsLite" size={16} onClick={openTokenSelector} />
      </div>

      {trackedAssets.length === 0 ? (
        <p className="text-footnote text-text-tertiary">{t('dashboard.priceCharts.emptyState')}</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {trackedAssets.map((asset, index) => (
            <PriceTileItem
              key={asset.priceId}
              asset={asset}
              index={index}
              price={prices[asset.priceId] ?? null}
              currencySymbol={currencySymbol}
              pending={pending}
              onSelect={setSelectedAsset}
            />
          ))}
        </div>
      )}

      {selectedAsset && (
        <PriceChartModal
          asset={selectedAsset}
          currency={currency}
          currentPrice={prices[selectedAsset.priceId] ?? null}
          onClose={closeChart}
        />
      )}

      {showTokenSelector && <TokenSelectionModal onClose={closeTokenSelector} />}
    </DashboardWidget>
  );
};

type PriceTileItemProps = {
  asset: TrackedAssetInfo;
  index: number;
  price: { price: number; change: number } | null;
  currencySymbol: string;
  pending: boolean;
  onSelect: (asset: TrackedAssetInfo) => void;
};

const PriceTileItem = memo(({ asset, index, price, currencySymbol, pending, onSelect }: PriceTileItemProps) => {
  const handleClick = useCallback(() => onSelect(asset), [onSelect, asset]);

  return (
    <PriceTile
      asset={asset}
      index={index}
      price={price}
      currencySymbol={currencySymbol}
      pending={pending}
      onClick={handleClick}
    />
  );
});
