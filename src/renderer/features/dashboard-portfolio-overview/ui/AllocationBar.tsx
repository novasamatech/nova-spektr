import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { ALLOCATION_COLORS } from '@/shared/ui/chart-constants';
import { Tooltip } from '@/shared/ui-kit';
import { type RowAllocation } from '../lib/computeRowAllocations';

type Props = {
  allocation: RowAllocation;
};

const SEGMENTS: {
  key: keyof RowAllocation;
  labelKey: 'assetBalance.transferable' | 'assetBalance.locked' | 'assetBalance.reserved' | 'assetBalance.vested';
  color: string;
}[] = [
  { key: 'transferablePct', labelKey: 'assetBalance.transferable', color: ALLOCATION_COLORS.transferable },
  { key: 'lockedPct', labelKey: 'assetBalance.locked', color: ALLOCATION_COLORS.locked },
  { key: 'reservedPct', labelKey: 'assetBalance.reserved', color: ALLOCATION_COLORS.reserved },
  { key: 'vestedPct', labelKey: 'assetBalance.vested', color: ALLOCATION_COLORS.vested },
];

export const AllocationBar = memo(({ allocation }: Props) => {
  const { t } = useI18n();

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <div className="relative w-full before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']">
          <div className="bg-input-border-disabled flex h-1.5 w-full overflow-hidden rounded-full">
            {SEGMENTS.map(
              (seg) =>
                allocation[seg.key] > 0 && (
                  <div
                    key={seg.key}
                    className="h-full"
                    style={{ width: `${allocation[seg.key]}%`, backgroundColor: seg.color }}
                  />
                ),
            )}
          </div>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="flex flex-col gap-0.5">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <FootnoteText className="text-white">
                {t(seg.labelKey)} {allocation[seg.key].toFixed(1)}%
              </FootnoteText>
            </div>
          ))}
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
});
