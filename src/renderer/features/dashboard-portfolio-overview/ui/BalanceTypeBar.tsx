import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatAsset } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, Loader } from '@/shared/ui';
import { ALLOCATION_COLORS, VESTED_HATCH } from '@/shared/ui/chart-constants';
import { type CurrencyItem } from '@/domains/price';
import { type AllocationData } from '../hooks/useBalanceAllocation';
import { type BalanceType, BALANCE_TYPES } from '../lib/balanceTypes';

import { Price } from './Price';

type Props = {
  allocation: AllocationData;
  currency: CurrencyItem | null;
  syncing: boolean;
  selectedType: BalanceType | null;
  onToggleType: (type: BalanceType) => void;
  onClear: () => void;
};

export const BalanceTypeBar = memo(({ allocation, currency, syncing, selectedType, onToggleType, onClear }: Props) => {
  const { t } = useI18n();

  const hasUnpricedVested = allocation.unpricedVested.length > 0;
  // Vesting that rides on reserved funds. It has a fiat value but no slice of
  // its own — see `vestingOverlapBN`.
  const hasOverlap = allocation.vestedOverlap.pct > 0;

  const visibleTypes = BALANCE_TYPES.filter(
    (type) => allocation.types[type].pct > 0 || (type === 'vested' && (hasUnpricedVested || hasOverlap)),
  );

  // Cross-filtering picks rows out of the fiat list by category. A chip can only
  // do that while the amount it prints is the amount the filter would select —
  // which rules out a chip with no fiat share at all, and a Vested chip whose
  // figure includes an overlap the list has no rows for.
  const isFilterable = (type: BalanceType) =>
    allocation.types[type].pct > 0 && (type !== 'vested' || (!hasOverlap && !hasUnpricedVested));

  /**
   * With an overlap the vested amount stops being a slice: it sits on top of
   * reserved, and of whatever it froze inside locked. So it folds back into the
   * segments it covers — keeping the bar a true partition — and is drawn as a
   * marker across them instead.
   */
  const barSegments = BALANCE_TYPES.flatMap((type) => {
    if (hasOverlap && type === 'vested') return [];

    const pct =
      hasOverlap && type === 'locked'
        ? allocation.types.locked.pct + allocation.types.vested.pct
        : allocation.types[type].pct;

    return pct > 0 ? [{ type, pct }] : [];
  });

  // The vesting span is contiguous and straddles the reserved/locked boundary:
  // it reaches left into reserved by the overlap, and right into locked by the
  // part that did freeze unreserved funds. Clamped, since the segments carry a
  // 6px floor that percentages alone don't know about.
  const overlapSpan = hasOverlap
    ? {
        left: Math.max(
          0,
          allocation.types.transferable.pct + allocation.types.reserved.pct - allocation.vestedOverlap.pct,
        ),
        width: Math.min(100, allocation.vestedOverlap.pct + allocation.types.vested.pct),
      }
    : null;

  const renderChipValue = (type: BalanceType) => {
    if (type !== 'vested') {
      return <Price amount={allocation.types[type].fiat} currency={currency} />;
    }

    const tokenAmounts = allocation.unpricedVested.map(({ asset, tokens }) => formatAsset(tokens, asset)).join(' · ');
    // Nothing priced to show — the whole figure is the token amount.
    if (hasUnpricedVested && allocation.types.vested.pct === 0 && !hasOverlap) {
      return `${tokenAmounts} · ${t('dashboard.portfolioOverview.vestedNotPriced')}`;
    }

    // Where the money actually sits, so the chip explains its own absence from
    // the bar rather than looking like a rounding error.
    const host = hasOverlap
      ? allocation.types.vested.pct > 0
        ? t('dashboard.portfolioOverview.vestedInReservedAndLocked')
        : t('dashboard.portfolioOverview.vestedInReserved')
      : null;

    return (
      <>
        <Price amount={allocation.vestedTotalFiat} currency={currency} />
        {host ? ` · ${host}` : null}
        {hasUnpricedVested ? ` · ${tokenAmounts}` : null}
      </>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <HelpText className="text-text-tertiary">{t('dashboard.portfolioOverview.balanceTypeDistribution')}</HelpText>
          {/* balances are still streaming in — show that the numbers are being updated */}
          <span className={cnTw('transition-opacity', syncing ? 'opacity-100' : 'opacity-0')}>
            <Loader size={10} color="primary" />
          </span>
        </span>
        <button
          className={cnTw(
            'flex cursor-pointer items-center gap-1 text-help-text font-semibold text-tab-text-accent transition-opacity',
            selectedType ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          tabIndex={selectedType ? undefined : -1}
          aria-hidden={!selectedType}
          onClick={onClear}
        >
          {t('dashboard.portfolioOverview.showAll')}
          <Icon name="close" size={12} className="text-inherit" />
        </button>
      </div>

      {barSegments.length > 0 && (
        <div className="relative mt-2">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-md">
            {barSegments.map(({ type, pct }) => (
              <button
                key={type}
                className={cnTw(
                  // flex-grow keeps gaps inside the container (percent widths would
                  // overflow it and clip the right rounding); min-width keeps tiny
                  // shares visible and clickable
                  'h-full min-w-1.5 basis-0 cursor-pointer transition-opacity',
                  selectedType && selectedType !== type ? 'opacity-30' : 'opacity-100',
                )}
                style={{ flexGrow: pct, backgroundColor: ALLOCATION_COLORS[type] }}
                onClick={() => onToggleType(type)}
              />
            ))}
          </div>

          {/*
            Purely indicative: no min-width floor and no pointer events. A trace
            of vesting inside a huge reserved balance is a sub-pixel span and is
            meant to disappear — widening it to stay visible would show $2 as if
            it were comparable to $10M. The chip carries that case.
          */}
          {overlapSpan && (
            <span
              aria-hidden
              className={cnTw(
                'pointer-events-none absolute inset-y-0 rounded-[2px] transition-opacity',
                selectedType ? 'opacity-30' : 'opacity-100',
              )}
              style={{
                left: `${overlapSpan.left}%`,
                width: `${overlapSpan.width}%`,
                backgroundImage: VESTED_HATCH,
              }}
            />
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleTypes.map((type) => (
          <button
            key={type}
            data-testid={`${TEST_IDS.DASHBOARD.BALANCE_TYPE_CHIP}-${type}`}
            className={cnTw(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-opacity',
              isFilterable(type) ? 'cursor-pointer' : 'cursor-default',
              selectedType === type ? 'bg-hover' : 'border-token-container-border',
              // a dashed edge marks the chip that has no segment to point at
              type === 'vested' && hasOverlap ? 'border-dashed' : null,
              selectedType && selectedType !== type ? 'opacity-30' : 'opacity-100',
            )}
            style={{ borderColor: selectedType === type ? ALLOCATION_COLORS[type] : undefined }}
            onClick={isFilterable(type) ? () => onToggleType(type) : undefined}
          >
            {type === 'vested' && hasOverlap ? (
              // matches the bar's hatch, so the chip and the marker read as one
              <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundImage: VESTED_HATCH }} />
            ) : (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[type] }} />
            )}
            <FootnoteText className="font-semibold">
              {t(`dashboard.portfolioOverview.balanceType.${type}`)}
            </FootnoteText>
            <FootnoteText className="text-text-tertiary">{renderChipValue(type)}</FootnoteText>
          </button>
        ))}
      </div>
    </div>
  );
});
