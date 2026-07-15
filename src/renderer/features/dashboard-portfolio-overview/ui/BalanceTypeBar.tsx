import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatAsset } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, Loader } from '@/shared/ui';
import { ALLOCATION_COLORS } from '@/shared/ui/chart-constants';
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
  const visibleTypes = BALANCE_TYPES.filter(
    (type) => allocation.types[type].pct > 0 || (type === 'vested' && hasUnpricedVested),
  );
  // a chip without a fiat share has nothing to cross-filter in the fiat-based list
  const isFilterable = (type: BalanceType) => allocation.types[type].pct > 0;
  const barTypes = visibleTypes.filter(isFilterable);

  const renderChipValue = (type: BalanceType) => {
    if (type !== 'vested' || !hasUnpricedVested) {
      return <Price amount={allocation.types[type].fiat} currency={currency} />;
    }

    const tokenAmounts = allocation.unpricedVested.map(({ asset, tokens }) => formatAsset(tokens, asset)).join(' · ');
    if (allocation.types.vested.pct === 0) return tokenAmounts;

    return (
      <>
        <Price amount={allocation.types.vested.fiat} currency={currency} />
        {` · ${tokenAmounts}`}
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

      {barTypes.length > 0 && (
        <div className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-md">
          {barTypes.map((type) => (
            <button
              key={type}
              className={cnTw(
                // flex-grow keeps gaps inside the container (percent widths would
                // overflow it and clip the right rounding); min-width keeps tiny
                // shares visible and clickable
                'h-full min-w-1.5 basis-0 cursor-pointer transition-opacity',
                selectedType && selectedType !== type ? 'opacity-30' : 'opacity-100',
              )}
              style={{ flexGrow: allocation.types[type].pct, backgroundColor: ALLOCATION_COLORS[type] }}
              onClick={() => onToggleType(type)}
            />
          ))}
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
              selectedType && selectedType !== type ? 'opacity-30' : 'opacity-100',
            )}
            style={{ borderColor: selectedType === type ? ALLOCATION_COLORS[type] : undefined }}
            onClick={isFilterable(type) ? () => onToggleType(type) : undefined}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ALLOCATION_COLORS[type] }} />
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
