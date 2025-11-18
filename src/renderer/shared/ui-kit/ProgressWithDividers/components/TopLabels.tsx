import { memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui/Typography';
import { type TopLabelsProps } from '../types';

export const TopLabels = memo(({ calculatedSegments, lastLabel = '∞' }: TopLabelsProps) => {
  const totalWidth = calculatedSegments.reduce((sum, segment) => sum + segment.width, 0);
  const lastSegment = calculatedSegments[calculatedSegments.length - 1];

  return (
    <div
      className="font-inter absolute top-[4px] left-0 h-[14px] text-[10px] leading-[14px] font-medium not-italic"
      style={{ width: `${totalWidth}px` }}
    >
      {calculatedSegments.map((calculatedSegment, index) => {
        const { state, topLabelPosition } = calculatedSegment;
        const isFirst = index === 0;
        const needsTransform = !isFirst;

        return (
          <div
            key={`top-${index}`}
            className={cnTw('absolute flex flex-col', topLabelPosition.align)}
            style={{
              left: topLabelPosition.left,
              top: '0px',
              height: '14px',
              transform: needsTransform ? 'translateX(-50%)' : undefined,
            }}
          >
            <CaptionText
              className={cnTw('leading-[14px] whitespace-nowrap', {
                'text-text-primary': !state.hasSelection || state.isSelectedBoundary,
                'text-text-tertiary': state.hasSelection && !state.isSelectedBoundary,
              })}
            >
              {calculatedSegment.topLabel}
            </CaptionText>
          </div>
        );
      })}
      <div className="absolute flex flex-col items-center" style={{ right: '0px', top: '0px', height: '14px' }}>
        <CaptionText
          className={cnTw('leading-[14px]', {
            'text-text-primary': !calculatedSegments.some(s => s.state.hasSelection) || lastSegment?.state.isSelected,
            'text-text-tertiary': calculatedSegments.some(s => s.state.hasSelection) && !lastSegment?.state.isSelected,
          })}
        >
          {lastLabel}
        </CaptionText>
      </div>
    </div>
  );
});

TopLabels.displayName = 'TopLabels';
