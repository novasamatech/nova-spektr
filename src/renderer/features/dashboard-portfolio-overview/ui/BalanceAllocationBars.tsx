import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { type AllocationData } from '../hooks/useBalanceAllocation';

type Props = {
  allocation: AllocationData;
};

type BarConfig = {
  labelKey: 'assetBalance.transferable' | 'assetBalance.locked' | 'assetBalance.reserved';
  color: string;
  pct: number;
};

const BARS: ((allocation: AllocationData) => BarConfig)[] = [
  (a) => ({ labelKey: 'assetBalance.transferable', color: '#53A867', pct: a.transferablePct }),
  (a) => ({ labelKey: 'assetBalance.locked', color: '#5A5FE0', pct: a.lockedPct }),
  (a) => ({ labelKey: 'assetBalance.reserved', color: '#F7931A', pct: a.reservedPct }),
];

export const BalanceAllocationBars = ({ allocation }: Props) => {
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
};
