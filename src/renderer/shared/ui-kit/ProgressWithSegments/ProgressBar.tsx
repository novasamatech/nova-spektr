import { memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui/Typography';

export interface SegmentData {
  id: string;
  label: string;
  width: number;
  color: string;
  filled: number;
}

interface ProgressWithSegmentsProps {
  currentProgress: number;
  segments: SegmentData[];
  className?: string;
  isHovered?: boolean;
}

const SEGMENT_GAP = 2;
const LABEL_OFFSET_TOP = 17;

const calculateSegmentPositions = (segments: SegmentData[]) => {
  let accumulatedWidth = 0;

  return segments.map((segment, index) => {
    const start = accumulatedWidth;
    const end = accumulatedWidth + segment.width;
    accumulatedWidth = end + (index < segments.length - 1 ? SEGMENT_GAP : 0);

    return {
      ...segment,
      start,
      end,
    };
  });
};

const calculateTotalFilledWidth = (segments: SegmentData[]) => {
  return segments.reduce((sum, segment, index) => {
    if (segment.filled > 0) {
      return sum + segment.width + (index > 0 ? SEGMENT_GAP : 0);
    }
    return sum;
  }, 0);
};

const ProgressSegment = memo(
  ({
    segment,
    isHovered,
    totalFilledWidth,
  }: {
    segment: SegmentData & { start: number; end: number };
    isHovered: boolean;
    totalFilledWidth: number;
  }) => {
    const segmentFillPercentage = segment.filled;
    const segmentVisibleWidth = segmentFillPercentage * segment.width;

    return (
      <div
        className="absolute h-2 rounded-sm bg-[#EEEEF7]"
        style={{
          left: `${segment.start}px`,
          width: `${segment.width}px`,
        }}
      >
        {segmentFillPercentage > 0 && (
          <div
            className="absolute h-2 overflow-hidden rounded-sm"
            style={{
              left: 0,
              width: `${segmentVisibleWidth}px`,
            }}
          >
            {isHovered ? (
              <div
                className={cnTw('absolute h-2', segment.color)}
                style={{
                  left: 0,
                  width: `${segment.width}px`,
                }}
              />
            ) : (
              <div
                className="absolute h-2"
                style={{
                  left: `-${segment.start}px`,
                  width: `${totalFilledWidth}px`,
                  background: 'linear-gradient(90deg, #E6E6E6 0%, #ABABAB 100%)',
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  },
);

ProgressSegment.displayName = 'ProgressSegment';

const BackgroundSegments = memo(({ segments }: { segments: SegmentData[] }) => (
  <div className="absolute top-0 right-0 flex" style={{ gap: `${SEGMENT_GAP}px` }}>
    {segments.map(segment => (
      <div
        key={`bg-${segment.id}`}
        className="h-2 rounded-full bg-tab-background/6"
        style={{ width: `${segment.width}px` }}
      />
    ))}
  </div>
));

BackgroundSegments.displayName = 'BackgroundSegments';

const SegmentLabels = memo(({ segments, isHovered }: { segments: SegmentData[]; isHovered: boolean }) => {
  if (!isHovered) return null;

  return (
    <div className="absolute top-0 left-0 w-full">
      {segments.map((segment, index) => {
        const segmentStart = segments.slice(0, index).reduce((sum, s) => sum + s.width + SEGMENT_GAP, 0);
        const hasProgress = segment.filled > 0;

        return (
          <div
            key={`label-${segment.id}`}
            className="absolute flex items-center justify-center"
            style={{
              left: `${segmentStart}px`,
              width: `${segment.width}px`,
              top: `${LABEL_OFFSET_TOP}px`,
            }}
          >
            <FootnoteText
              className={cnTw('font-normal whitespace-nowrap', {
                'text-text-primary': hasProgress,
                'text-text-tertiary': !hasProgress,
              })}
            >
              {segment.label}
            </FootnoteText>
          </div>
        );
      })}
    </div>
  );
});

SegmentLabels.displayName = 'SegmentLabels';

export const ProgressWithSegments = memo(
  ({ currentProgress: _currentProgress, segments, className = '', isHovered = false }: ProgressWithSegmentsProps) => {
    const segmentPositions = calculateSegmentPositions(segments);
    const totalFilledWidth = calculateTotalFilledWidth(segments);

    return (
      <div className={cnTw('relative w-full', className)}>
        <div className="relative h-2 w-full">
          <BackgroundSegments segments={segments} />

          <div className="absolute top-0 left-0 h-2">
            {segmentPositions.map(segment => (
              <ProgressSegment
                key={segment.id}
                segment={segment}
                isHovered={isHovered}
                totalFilledWidth={totalFilledWidth}
              />
            ))}
          </div>
        </div>

        <SegmentLabels segments={segments} isHovered={isHovered} />
      </div>
    );
  },
);

ProgressWithSegments.displayName = 'ProgressWithSegments';
