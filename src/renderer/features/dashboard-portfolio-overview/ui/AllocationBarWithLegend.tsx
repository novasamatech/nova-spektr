import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { ALLOCATION_COLORS } from '@/shared/ui/chart-constants';
import { type CurrencyItem } from '@/domains/price';
import { type BalanceType, BALANCE_TYPES } from '../lib/balanceTypes';
import { type RowAllocation } from '../lib/computeRowAllocations';

import { Price } from './Price';

type Props = {
  allocation: RowAllocation;
  symbol: string;
  precision: number;
  currency: CurrencyItem | null;
};

export const AllocationBarWithLegend = memo(({ allocation, symbol, precision, currency }: Props) => {
  const { t } = useI18n();

  const visibleTypes = BALANCE_TYPES.filter((type) => allocation[type].pct > 0);

  return (
    <div className="w-full">
      <div className="flex h-[7px] w-full overflow-hidden rounded-full">
        {visibleTypes.map((type) => (
          <div
            key={type}
            className="h-full"
            style={{ width: `${allocation[type].pct}%`, backgroundColor: ALLOCATION_COLORS[type] }}
          />
        ))}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {visibleTypes.map((type) => (
          <LegendItem
            key={type}
            type={type}
            allocation={allocation}
            symbol={symbol}
            precision={precision}
            currency={currency}
            labelText={t(`dashboard.portfolioOverview.balanceType.${type}`)}
          />
        ))}
      </div>
    </div>
  );
});

type LegendItemProps = {
  type: BalanceType;
  allocation: RowAllocation;
  symbol: string;
  precision: number;
  currency: CurrencyItem | null;
  labelText: string;
};

const LegendItem = ({ type, allocation, symbol, precision, currency, labelText }: LegendItemProps) => {
  const { formatted, suffix } = formatBalance(allocation[type].raw, precision);

  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[type] }} />
      <div className="min-w-0">
        <span
          className="block text-help-text font-medium text-text-primary tabular-nums"
          style={type === 'vested' ? { color: ALLOCATION_COLORS.vested } : undefined}
        >
          {formatted}
          {suffix} {symbol}
        </span>
        <HelpText className="text-text-tertiary">
          {labelText} · <Price amount={allocation[type].fiat} currency={currency} />
        </HelpText>
      </div>
    </div>
  );
};
