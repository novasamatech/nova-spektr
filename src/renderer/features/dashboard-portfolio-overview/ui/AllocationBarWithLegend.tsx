import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { ALLOCATION_COLORS, ALLOCATION_MARKER_MIN_PX, VESTED_HATCH } from '@/shared/ui/chart-constants';
import { type CurrencyItem } from '@/domains/price';
import { type BalanceType, BALANCE_TYPES, makeByType } from '../lib/balanceTypes';
import { computeOverlapBarLayout } from '../lib/computeOverlapBarLayout';
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

  const { types, vestedOverlap, vestedTotal } = allocation;

  // Vesting that rides on reserved funds — see `vestingOverlapBN`. Presence is
  // judged by the raw amount: a dust overlap whose fiat share rounds to zero
  // must still hatch the legend and print the whole vesting.
  const hasOverlap = vestedOverlap.raw !== '0';

  const visibleTypes = BALANCE_TYPES.filter((type) => types[type].pct > 0 || (type === 'vested' && hasOverlap));

  const { segments: barSegments, overlapSpan } = computeOverlapBarLayout({
    types: makeByType((type) => types[type].pct),
    overlapPct: vestedOverlap.pct,
    hasOverlap,
  });

  return (
    <div className="w-full">
      <div className="relative">
        <div className="flex h-[7px] w-full overflow-hidden rounded-full">
          {barSegments.map(({ type, pct }) => (
            <div key={type} className="h-full" style={{ width: `${pct}%`, backgroundColor: ALLOCATION_COLORS[type] }} />
          ))}
        </div>

        {overlapSpan && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 rounded-[2px]"
            style={{
              left: `min(${overlapSpan.left}%, calc(100% - ${ALLOCATION_MARKER_MIN_PX}px))`,
              width: `${overlapSpan.width}%`,
              minWidth: `${ALLOCATION_MARKER_MIN_PX}px`,
              backgroundImage: VESTED_HATCH,
            }}
          />
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {visibleTypes.map((type) => {
          // With an overlap the legend prints the whole vesting — partition
          // slice plus the part riding on reserved — so the figure matches the
          // holdings row the Vested filter selected.
          const amounts = type === 'vested' && hasOverlap ? vestedTotal : types[type];

          return (
            <LegendItem
              key={type}
              type={type}
              raw={amounts.raw}
              fiat={amounts.fiat}
              hatched={type === 'vested' && hasOverlap}
              symbol={symbol}
              precision={precision}
              currency={currency}
              labelText={t(`dashboard.portfolioOverview.balanceType.${type}`)}
            />
          );
        })}
      </div>
    </div>
  );
});

type LegendItemProps = {
  type: BalanceType;
  raw: string;
  fiat: string;
  hatched: boolean;
  symbol: string;
  precision: number;
  currency: CurrencyItem | null;
  labelText: string;
};

const LegendItem = ({ type, raw, fiat, hatched, symbol, precision, currency, labelText }: LegendItemProps) => {
  const { formatted, suffix } = formatBalance(raw, precision);

  return (
    <div className="flex items-start gap-1.5">
      {/* hatched swatch is a square, same as the distribution bar's chip — the
          stripes are illegible on a dot this size */}
      <span
        className={cnTw('mt-1 h-1.5 w-1.5 shrink-0', hatched ? 'rounded-[2px]' : 'rounded-full')}
        style={hatched ? { backgroundImage: VESTED_HATCH } : { backgroundColor: ALLOCATION_COLORS[type] }}
      />
      <div className="min-w-0">
        <span
          className="block text-help-text font-medium text-text-primary tabular-nums"
          style={type === 'vested' ? { color: ALLOCATION_COLORS.vested } : undefined}
        >
          {formatted}
          {suffix} {symbol}
        </span>
        <HelpText className="text-text-tertiary">
          {labelText} · <Price amount={fiat} currency={currency} />
        </HelpText>
      </div>
    </div>
  );
};
