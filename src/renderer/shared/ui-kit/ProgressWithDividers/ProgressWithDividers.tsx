import { memo, useCallback, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';

import { SegmentLabels } from './components/SegmentLabels';
import { Segments } from './components/Segments';
import { TopLabels } from './components/TopLabels';
import { type ProgressWithDividersProps } from './types';
import { calculateSegmentsWithState, calculateTotalWidth } from './utils';

export const ProgressWithDividers = memo(
  ({
    segments,
    currentSegmentId,
    onSegmentClick,
    className,
    lastLabel,
    bottomLabelPrefix = 'Step',
  }: ProgressWithDividersProps) => {
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

    const calculatedSegments = calculateSegmentsWithState(segments, currentSegmentId, selectedSegmentId);
    const totalWidth = calculateTotalWidth(segments);

    const handleSegmentClick = useCallback(
      (segmentId: string) => {
        setSelectedSegmentId(segmentId);
        onSegmentClick?.(segmentId);
      },
      [onSegmentClick],
    );

    return (
      <div
        className={cnTw('relative h-[74px] overflow-hidden rounded-[8px]', className)}
        style={{ width: `${totalWidth}px` }}
      >
        <TopLabels calculatedSegments={calculatedSegments} lastLabel={lastLabel} />
        <Segments
          calculatedSegments={calculatedSegments}
          bottomLabelPrefix={bottomLabelPrefix}
          onSegmentClick={handleSegmentClick}
        />
        <SegmentLabels calculatedSegments={calculatedSegments} bottomLabelPrefix={bottomLabelPrefix} />
      </div>
    );
  },
);

ProgressWithDividers.displayName = 'ProgressWithDividers';
