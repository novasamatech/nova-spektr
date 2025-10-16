import { memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { CaptionText, FootnoteText } from '@/shared/ui/Typography';
import { type SegmentLabelsProps } from '../types';
import { getSegmentLabelTextColor } from '../utils';

export const SegmentLabels = memo(({ calculatedSegments, bottomLabelPrefix }: SegmentLabelsProps) => {
  const totalWidth = calculatedSegments.reduce((sum, segment) => sum + segment.width, 0);

  return (
    <div className="pointer-events-none absolute top-[42px] left-0 h-[28px]" style={{ width: `${totalWidth}px` }}>
      {calculatedSegments.map(calculatedSegment => {
        const { state, position } = calculatedSegment;

        return (
          <div
            key={`label-${calculatedSegment.id}`}
            className="absolute h-[28px]"
            style={{ left: position.containerLeft, width: position.containerWidth, top: 0 }}
          >
            <div
              className={cnTw(
                'absolute flex h-full flex-col content-stretch items-center justify-center gap-[2px] text-center text-[10px] not-italic',
              )}
              style={{ left: '50%', transform: 'translateX(-50%)', width: position.textWidth }}
            >
              <div className="font-inter relative flex w-full shrink-0 flex-col justify-end font-semibold uppercase">
                <CaptionText
                  className={cnTw('text-center leading-[12px]', {
                    [getSegmentLabelTextColor(state)]: true,
                  })}
                >
                  {bottomLabelPrefix} {calculatedSegment.id}
                </CaptionText>
              </div>
              <div className="font-inter relative flex w-full shrink-0 flex-col justify-end font-medium">
                <FootnoteText
                  className={cnTw('text-center leading-[14px]', {
                    [getSegmentLabelTextColor(state)]: true,
                  })}
                >
                  {calculatedSegment.title}
                </FootnoteText>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

SegmentLabels.displayName = 'SegmentLabels';
