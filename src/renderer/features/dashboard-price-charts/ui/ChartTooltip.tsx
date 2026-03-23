import { CHART_TOOLTIP_STYLE } from '@/shared/ui/chart-constants';
import { type PriceHistoryTimeRange } from '@/domains/price';

type TooltipPayloadItem = {
  payload: {
    timestamp: number;
    price: number;
  };
};

type Props = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  currencySymbol: string;
  timeRange: PriceHistoryTimeRange;
};

function formatDate(timestamp: number, timeRange: PriceHistoryTimeRange): string {
  const date = new Date(timestamp);

  if (timeRange === '1d' || timeRange === '7d') {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export const ChartTooltip = ({ active, payload, currencySymbol, timeRange }: Props) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  const { timestamp, price } = item.payload;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>
        {currencySymbol}
        {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </div>
      <div style={{ color: '#757575' }}>{formatDate(timestamp, timeRange)}</div>
    </div>
  );
};
