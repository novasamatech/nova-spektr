import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { ALLOCATION_COLORS, VESTED_HATCH } from '@/shared/ui/chart-constants';
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

// Same floor `BalanceTypeBar` gives its marker: a trace of vesting inside a
// large reserved balance is a sub-pixel span nobody can find otherwise.
const MARKER_MIN_PX = 6;

export const AllocationBarWithLegend = memo(({ allocation, symbol, precision, currency }: Props) => {
  const { t } = useI18n();

  const { types, vestedOverlap, vestedTotal } = allocation;

  // Vesting that rides on reserved funds. It has a fiat value but no slice of
  // its own — see `vestingOverlapBN`.
  const hasOverlap = vestedOverlap.pct > 0;

  const visibleTypes = BALANCE_TYPES.filter((type) => types[type].pct > 0 || (type === 'vested' && hasOverlap));

  // Same fold `BalanceTypeBar` does: with an overlap the vested amount stops
  // being a slice, so it merges into the segments it covers and is drawn as a
  // marker across them instead.
  const barSegments = BALANCE_TYPES.flatMap((type) => {
    if (hasOverlap && type === 'vested') return [];

    const pct = hasOverlap && type === 'locked' ? types.locked.pct + types.vested.pct : types[type].pct;

    return pct > 0 ? [{ type, pct }] : [];
  });

  // Contiguous span straddling the reserved/locked boundary: left into reserved
  // by the overlap, right into locked by the part that did freeze free funds.
  const overlapSpan = hasOverlap
    ? {
        left: Math.max(0, types.transferable.pct + types.reserved.pct - vestedOverlap.pct),
        width: Math.min(100, vestedOverlap.pct + types.vested.pct),
      }
    : null;

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
              left: `min(${overlapSpan.left}%, calc(100% - ${MARKER_MIN_PX}px))`,
              width: `${overlapSpan.width}%`,
              minWidth: `${MARKER_MIN_PX}px`,
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
      <span
        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
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
