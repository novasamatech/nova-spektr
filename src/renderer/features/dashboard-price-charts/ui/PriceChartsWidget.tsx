import { useStoreMap, useUnit } from 'effector-react';

import { currencyModel, priceProviderModel } from '@/entities/price';
import { TRACKED_ASSETS, priceHistoryModel } from '../model/price-history-model';

import { PriceChartCard } from './PriceChartCard';
import { TimeRangeToggle } from './TimeRangeToggle';
import { DOT_COLOR, KSM_COLOR } from './chartConstants';

const ASSET_COLORS: Record<string, string> = {
  polkadot: DOT_COLOR,
  kusama: KSM_COLOR,
};

export const PriceChartsWidget = () => {
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const timeRange = useUnit(priceHistoryModel.$timeRange);

  const prices = useStoreMap({
    store: priceProviderModel.$assetsPrices,
    keys: [currency],
    fn: (allPrices, [curr]) => {
      if (!allPrices || !curr) return {};

      const result: Record<string, { price: number; change: number }> = {};
      for (const asset of TRACKED_ASSETS) {
        const assetPrices = allPrices[asset.id];
        if (assetPrices) {
          const priceItem = assetPrices[curr.coingeckoId];
          if (priceItem) {
            result[asset.id] = priceItem;
          }
        }
      }

      return result;
    },
  });

  if (!fiatFlag || !currency) return null;

  return (
    <div className="flex w-[480px] flex-col gap-3">
      <TimeRangeToggle value={timeRange} onChange={priceHistoryModel.events.timeRangeChanged} />
      {TRACKED_ASSETS.map((asset) => (
        <PriceChartCard
          key={asset.id}
          assetId={asset.id}
          label={asset.label}
          color={ASSET_COLORS[asset.id] ?? DOT_COLOR}
          currency={currency}
          currentPrice={prices[asset.id] ?? null}
          timeRange={timeRange}
        />
      ))}
    </div>
  );
};
