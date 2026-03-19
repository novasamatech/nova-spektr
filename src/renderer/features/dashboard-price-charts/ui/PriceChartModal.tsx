import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { TitleText } from '@/shared/ui';
import { getColorByPriceId } from '@/shared/ui/chart-constants';
import { AssetIcon } from '@/shared/ui-entities';
import { Modal, Skeleton } from '@/shared/ui-kit';
import {
  type CurrencyItem,
  type PriceHistoryTimeRange,
  type PriceRange,
  priceHistoryResource,
  usePriceHistory,
} from '@/domains/price';
import { type TrackedAssetInfo } from '../hooks/useAvailableAssets';

import { ChartTooltip } from './ChartTooltip';
import { PriceChange } from './PriceChange';
import { TimeRangeToggle } from './TimeRangeToggle';

type Props = {
  asset: TrackedAssetInfo;
  currency: CurrencyItem;
  currentPrice: { price: number; change: number } | null;
  onClose: () => void;
};

type ChartDataPoint = {
  timestamp: number;
  price: number;
};

const CHART_HEIGHT = 200;
const RETRY_TIMEOUT_MS = 10_000;

export const PriceChartModal = ({ asset, currency, currentPrice, onClose }: Props) => {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<PriceHistoryTimeRange>('7d');
  const [showRetry, setShowRetry] = useState(false);

  const color = getColorByPriceId(asset.priceId, 0);
  const currencySymbol = currency.symbol ?? currency.code;
  const gradientId = `modal-gradient-${asset.priceId}`;

  const { data: historyData, pending } = usePriceHistory({
    assetId: asset.priceId,
    currency: currency.coingeckoId,
    range: timeRange,
  });

  useEffect(() => {
    if (!pending) {
      setShowRetry(false);

      return;
    }
    const timer = setTimeout(() => setShowRetry(true), RETRY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [pending]);

  const handleRetry = () => {
    priceHistoryResource.start({ assetId: asset.priceId, currency: currency.coingeckoId, range: timeRange });
  };

  const chartData: ChartDataPoint[] =
    historyData?.map(([timestamp, price]: PriceRange) => ({
      timestamp,
      price: typeof price === 'string' ? parseFloat(price) : price,
    })) ?? [];

  const rangeChange = (() => {
    if (chartData.length < 2) return undefined;

    const firstPrice = chartData[0]?.price;
    const lastPrice = chartData[chartData.length - 1]?.price;
    if (!firstPrice || !lastPrice) return undefined;

    return ((lastPrice - firstPrice) / firstPrice) * 100;
  })();

  return (
    <Modal size="md" isOpen onToggle={(open) => !open && onClose()}>
      <Modal.Title close>
        <div className="flex items-center gap-2">
          <AssetIcon asset={asset} size={28} />
          <TitleText>{asset.symbol}</TitleText>
        </div>
      </Modal.Title>
      <Modal.Content>
        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex items-baseline gap-2">
            {currentPrice ? (
              <>
                <TitleText>
                  {currencySymbol}
                  {currentPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </TitleText>
                <PriceChange change={rangeChange} />
              </>
            ) : pending ? (
              <Skeleton width={25} height={7} />
            ) : null}
          </div>

          <TimeRangeToggle value={timeRange} onChange={setTimeRange} />

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" hide />
                <YAxis hide domain={[(min: number) => min * 0.999, (max: number) => max * 1.001]} />
                <Tooltip
                  content={<ChartTooltip currencySymbol={currencySymbol} timeRange={timeRange} />}
                  cursor={{ stroke: color, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: CHART_HEIGHT }} className="relative">
              <Skeleton width="100%" height={`${CHART_HEIGHT}px`} />
              {showRetry && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    className="text-footnote font-semibold text-primary-button-background-default"
                    onClick={handleRetry}
                  >
                    {t('dashboard.priceCharts.retry')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};
