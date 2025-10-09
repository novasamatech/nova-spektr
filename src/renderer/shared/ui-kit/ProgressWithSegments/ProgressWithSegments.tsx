import { memo, useMemo } from 'react';

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

interface ProgressSegmentProps {
  segment: SegmentData;
  isHovered: boolean;
  isLastSegment: boolean;
  segmentStartPosition: number;
  totalFilledWidth: number;
}

const ProgressSegment = memo(
  ({ segment, isHovered, isLastSegment, segmentStartPosition, totalFilledWidth }: ProgressSegmentProps) => {
    const fillWidth = segment.filled * segment.width;
    const hasProgress = segment.filled > 0;

    return (
      <>
        <div className="relative h-2 shrink-0 rounded-sm bg-[#EEEEF7]" style={{ width: `${segment.width}px` }}>
          {hasProgress && (
            <div className="absolute top-0 left-0 h-2 overflow-hidden rounded-sm" style={{ width: `${fillWidth}px` }}>
              {isHovered ? (
                <div className={cnTw('h-2', segment.color)} style={{ width: `${segment.width}px` }} />
              ) : (
                <div
                  className="h-2 bg-gradient-to-r from-[#E6E6E6] to-[#ABABAB]"
                  style={{
                    width: `${totalFilledWidth}px`,
                    marginLeft: `-${segmentStartPosition}px`,
                  }}
                />
              )}
            </div>
          )}
        </div>
        {!isLastSegment && <div className="shrink-0" style={{ width: `${SEGMENT_GAP}px` }} />}
      </>
    );
  },
);

ProgressSegment.displayName = 'ProgressSegment';

interface SegmentLabelsProps {
  segments: SegmentData[];
  isHovered: boolean;
}

const SegmentLabels = memo(({ segments, isHovered }: SegmentLabelsProps) => {
  if (!isHovered) return null;

  return (
    <div className="mt-2 flex items-center" style={{ gap: `${SEGMENT_GAP}px` }}>
      {segments.map(segment => {
        const hasProgress = segment.filled > 0;

        return (
          <div
            key={`label-${segment.id}`}
            className="flex shrink-0 items-center justify-center"
            style={{ width: `${segment.width}px` }}
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
    const { totalFilledWidth, segmentPositions } = useMemo(() => {
      let accumulatedPosition = 0;
      let filledWidth = 0;

      const positions = segments.map((segment, index) => {
        const position = accumulatedPosition;
        accumulatedPosition += segment.width + (index < segments.length - 1 ? SEGMENT_GAP : 0);

        if (segment.filled > 0) {
          filledWidth = accumulatedPosition - (index < segments.length - 1 ? SEGMENT_GAP : 0);
        }

        return position;
      });

      return {
        totalFilledWidth: filledWidth,
        segmentPositions: positions,
      };
    }, [segments]);

    return (
      <div className={cnTw('w-full', className)}>
        <div className="flex items-center">
          {segments.map((segment, index) => (
            <ProgressSegment
              key={segment.id}
              segment={segment}
              isHovered={isHovered}
              isLastSegment={index === segments.length - 1}
              segmentStartPosition={segmentPositions[index] ?? 0}
              totalFilledWidth={totalFilledWidth}
            />
          ))}
        </div>

        <SegmentLabels segments={segments} isHovered={isHovered} />
      </div>
    );
  },
);

ProgressWithSegments.displayName = 'ProgressWithSegments';
