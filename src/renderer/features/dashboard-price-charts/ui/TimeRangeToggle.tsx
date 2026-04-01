import { memo, useCallback } from 'react';

import { useI18n } from '@/shared/i18n';
import { type PriceHistoryTimeRange } from '@/domains/price';

type Props = {
  value: PriceHistoryTimeRange;
  onChange: (range: PriceHistoryTimeRange) => void;
};

const toggleButtonClass = 'flex-1 rounded px-3 py-1 text-footnote font-semibold transition-colors';
const activeClass = 'bg-white text-text-primary shadow-sm';
const inactiveClass = 'text-text-tertiary hover:text-text-secondary';

const RANGES: PriceHistoryTimeRange[] = ['1d', '7d', '30d', '90d'];

export const TimeRangeToggle = memo(({ value, onChange }: Props) => {
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
        <RangeButton key={range} range={range} active={value === range} label={labels[range]} onChange={onChange} />
      ))}
    </div>
  );
});

type RangeButtonProps = {
  range: PriceHistoryTimeRange;
  active: boolean;
  label: string;
  onChange: (range: PriceHistoryTimeRange) => void;
};

const RangeButton = memo(({ range, active, label, onChange }: RangeButtonProps) => {
  const handleClick = useCallback(() => onChange(range), [onChange, range]);

  return (
    <button className={`${toggleButtonClass} ${active ? activeClass : inactiveClass}`} onClick={handleClick}>
      {label}
    </button>
  );
});
