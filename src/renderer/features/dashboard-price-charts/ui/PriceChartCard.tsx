import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { type CurrencyItem, type PriceRange } from '@/shared/api/price-provider';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, TitleText } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { type PriceHistoryTimeRange, priceHistoryResource, usePriceHistory } from '@/domains/network';

import { ChartTooltip } from './ChartTooltip';
import { PriceChange } from './PriceChange';

type Props = {
  assetId: string;
  label: string;
  color: string;
  currency: CurrencyItem;
  currentPrice: { price: number; change: number } | null;
  timeRange: PriceHistoryTimeRange;
};

type ChartDataPoint = {
  timestamp: number;
  price: number;
};

const CHART_HEIGHT = 120;
const RETRY_TIMEOUT_MS = 10_000;
const containerClass = 'rounded-lg border border-token-container-border bg-card-background p-4 shadow-card-shadow';

export const PriceChartCard = ({ assetId, label, color, currency, currentPrice, timeRange }: Props) => {
  const { t } = useI18n();
  const currencySymbol = currency.symbol ?? currency.code;
  const gradientId = `gradient-${label}`;

  const { data: historyData, pending } = usePriceHistory({
    assetId,
    currency: currency.coingeckoId,
    range: timeRange,
  });

  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShowRetry(false);

      return;
    }
    const timer = setTimeout(() => setShowRetry(true), RETRY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [pending]);

  const handleRetry = () => {
    priceHistoryResource.start({ assetId, currency: currency.coingeckoId, range: timeRange });
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

  const renderHeader = () => (
    <div className="mb-2 flex items-baseline gap-2">
      <FootnoteText className="text-text-tertiary">{label}</FootnoteText>
      {currentPrice ? (
        <>
          <TitleText>
            {currencySymbol}
            {currentPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </TitleText>
          <PriceChange change={rangeChange} />
        </>
      ) : pending ? (
        <Skeleton width="100px" height="28px" />
      ) : null}
    </div>
  );

  const renderChart = () => {
    if (chartData.length > 0) {
      return (
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
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <div style={{ height: CHART_HEIGHT }} className="relative">
        <Skeleton width="100%" height={`${CHART_HEIGHT}px`} />
        {showRetry && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              className="text-footnote font-semibold text-primary-button-background-default"
              onClick={handleRetry}
            >
              {t('dashboard.priceCharts.retry')}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={containerClass}>
      {renderHeader()}
      {renderChart()}
    </div>
  );
};
