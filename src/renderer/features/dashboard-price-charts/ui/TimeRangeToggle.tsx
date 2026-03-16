import { useI18n } from '@/shared/i18n';
import { type PriceHistoryTimeRange } from '@/domains/network';

type Props = {
  value: PriceHistoryTimeRange;
  onChange: (range: PriceHistoryTimeRange) => void;
};

const toggleButtonClass = 'flex-1 rounded px-3 py-1 text-footnote font-semibold transition-colors';
const activeClass = 'bg-card-background text-text-primary shadow-sm';
const inactiveClass = 'text-text-tertiary hover:text-text-secondary';

const RANGES: PriceHistoryTimeRange[] = ['1d', '7d', '30d', '90d'];

export const TimeRangeToggle = ({ value, onChange }: Props) => {
  const { t } = useI18n();

  const labels: Record<PriceHistoryTimeRange, string> = {
    '1d': t('dashboard.priceCharts.range1d'),
    '7d': t('dashboard.priceCharts.range7d'),
    '30d': t('dashboard.priceCharts.range30d'),
    '90d': t('dashboard.priceCharts.range90d'),
  };

  return (
    <div className="flex w-fit rounded-md bg-tab-background p-0.5">
      {RANGES.map((range) => (
        <button
          key={range}
          className={`${toggleButtonClass} ${value === range ? activeClass : inactiveClass}`}
          onClick={() => onChange(range)}
        >
          {labels[range]}
        </button>
      ))}
    </div>
  );
};
