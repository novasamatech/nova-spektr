import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { type PriceHistoryTimeRange } from '@/domains/price';
import { currencyModel, priceProviderModel, useAssetsPrices } from '@/domains/price';

import { PriceChartCard } from './PriceChartCard';
import { TimeRangeToggle } from './TimeRangeToggle';
import { DOT_COLOR, KSM_COLOR } from './chartConstants';

const TRACKED_ASSETS = [
  { id: 'polkadot', label: 'DOT' },
  { id: 'kusama', label: 'KSM' },
];

const ASSET_COLORS: Record<string, string> = {
  polkadot: DOT_COLOR,
  kusama: KSM_COLOR,
};

export const PriceChartsWidget = () => {
  const [timeRange, setTimeRange] = useState<PriceHistoryTimeRange>('7d');

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const pricesParams = useUnit(priceProviderModel.$currentPricesParams);
  const { data: allPrices } = useAssetsPrices(pricesParams);

  const prices = useMemo(() => {
    if (!allPrices || !currency) return {};

    const result: Record<string, { price: number; change: number }> = {};
    for (const asset of TRACKED_ASSETS) {
      const assetPrices = allPrices[asset.id];
      if (assetPrices) {
        const priceItem = assetPrices[currency.coingeckoId];
        if (priceItem) {
          result[asset.id] = priceItem;
        }
      }
    }

    return result;
  }, [allPrices, currency]);

  if (!fiatFlag || !currency) return null;

  return (
    <div className="flex w-[480px] flex-col gap-3">
      <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
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
