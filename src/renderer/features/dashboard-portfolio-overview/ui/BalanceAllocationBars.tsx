import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { ALLOCATION_COLORS } from '@/shared/ui/chart-constants';
import { type AllocationData } from '../hooks/useBalanceAllocation';

type Props = {
  allocation: AllocationData;
};

type BarConfig = {
  labelKey: 'assetBalance.transferable' | 'assetBalance.locked' | 'assetBalance.reserved' | 'assetBalance.vested';
  color: string;
  pct: number;
};

const BARS: ((allocation: AllocationData) => BarConfig)[] = [
  (a) => ({ labelKey: 'assetBalance.transferable', color: ALLOCATION_COLORS.transferable, pct: a.transferablePct }),
  (a) => ({ labelKey: 'assetBalance.locked', color: ALLOCATION_COLORS.locked, pct: a.lockedPct }),
  (a) => ({ labelKey: 'assetBalance.reserved', color: ALLOCATION_COLORS.reserved, pct: a.reservedPct }),
  (a) => ({ labelKey: 'assetBalance.vested', color: ALLOCATION_COLORS.vested, pct: a.vestedPct }),
];

export const BalanceAllocationBars = memo(({ allocation }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex min-w-[300px] flex-col gap-2">
      <FootnoteText className="text-text-tertiary">{t('dashboard.portfolioOverview.assetAllocation')}</FootnoteText>
      {BARS.map((getConfig) => {
        const { labelKey, color, pct } = getConfig(allocation);
        const displayPct = pct.toFixed(1);

        return (
          <div key={labelKey} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <FootnoteText className="text-text-secondary">{t(labelKey)}</FootnoteText>
              <FootnoteText className="text-text-tertiary">{displayPct}%</FootnoteText>
            </div>
            <div className="bg-input-border-disabled h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});
