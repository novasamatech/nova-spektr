// src/renderer/features/dashboard-portfolio-overview/ui/AllocationExpandRow.tsx
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { type RowAllocation } from '../lib/computeRowAllocations';

type Props = {
  allocation: RowAllocation;
  colSpan: number;
  expanded: boolean;
};

const SEGMENTS: {
  key: keyof RowAllocation;
  labelKey: 'assetBalance.transferable' | 'assetBalance.locked' | 'assetBalance.reserved';
  color: string;
}[] = [
  { key: 'transferablePct', labelKey: 'assetBalance.transferable', color: '#53A867' },
  { key: 'lockedPct', labelKey: 'assetBalance.locked', color: '#5A5FE0' },
  { key: 'reservedPct', labelKey: 'assetBalance.reserved', color: '#F7931A' },
];

export const AllocationExpandRow = memo(({ allocation, colSpan, expanded }: Props) => {
  const { t } = useI18n();

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden" style={{ minHeight: 0 }}>
            <div className="mx-3 mb-2 rounded-md bg-block-background-default px-4 py-2">
              <div className="flex h-1.5 overflow-hidden rounded-full">
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
              <div className="mt-1.5 flex gap-4">
                {SEGMENTS.map((seg) => (
                  <div key={seg.key} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                    <FootnoteText className="text-text-tertiary">
                      {t(seg.labelKey)} {allocation[seg.key].toFixed(1)}%
                    </FootnoteText>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
});
