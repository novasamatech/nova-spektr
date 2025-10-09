import { memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type SegmentProps } from '../types';

export const Segment = memo(({ calculatedSegment, bottomLabelPrefix, onSegmentClick }: SegmentProps) => {
  const { state } = calculatedSegment;
  const width = `${calculatedSegment.width}px`;

  return (
    <button
      type="button"
      className="relative flex shrink-0 cursor-pointer content-stretch items-end border-0 bg-transparent p-0 after:absolute after:top-0 after:left-0 after:h-[60px] after:w-full"
      style={{ width }}
      aria-label={`${bottomLabelPrefix} ${calculatedSegment.id}: ${calculatedSegment.title}`}
      onClick={() => onSegmentClick(calculatedSegment.id)}
    >
      <div
        className={cnTw('h-[12px] w-[2px] shrink-0 rounded-tl-[100px] rounded-tr-[100px]', {
          'bg-text-primary': !state.hasSelection ? state.isActive : state.isSelectedBoundary,
          'bg-gray-300': !state.hasSelection ? !state.isActive : !state.isSelectedBoundary,
        })}
      />

      {!state.isLast && (
        <div className="relative h-[8px] min-h-px min-w-px flex-1 shrink-0 grow basis-0 bg-tab-background">
          {state.nextIsActive && !state.hasSelection && (
            <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', calculatedSegment.color)} />
          )}
          {state.hasSelection &&
            (state.nextIsActive || state.isSelected) &&
            (!state.isPartialProgress || !state.isSelected) && (
              <div
                className={cnTw('absolute top-0 right-0 left-0 h-[8px]', calculatedSegment.color, {
                  'opacity-30': !state.isSelected,
                })}
              />
            )}
          {state.hasSelection &&
            state.isSelected &&
            !state.nextIsActive &&
            (!state.isPartialProgress || !state.isSelected) && (
              <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', calculatedSegment.color)} />
            )}
          {state.isPartialProgress && (
            <div
              className={cnTw('absolute top-0 left-0 h-[8px]', calculatedSegment.color, {
                'opacity-30': state.hasSelection && !state.isSelected,
              })}
              style={{ width: `${calculatedSegment.width / 2}px` }}
            />
          )}
        </div>
      )}

      {state.isLast && (
        <>
          <div className="relative h-[8px] min-h-px min-w-px flex-1 shrink-0 grow basis-0 bg-tab-background">
            {state.isActive && !state.hasSelection && (
              <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', calculatedSegment.color)} />
            )}
            {state.hasSelection && (state.isActive || state.isSelected) && (
              <div
                className={cnTw('absolute top-0 right-0 left-0 h-[8px]', calculatedSegment.color, {
                  'opacity-30': !state.isSelected,
                })}
              />
            )}
            {state.hasSelection && state.isSelected && !state.isActive && (
              <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', calculatedSegment.color)} />
            )}
          </div>
          <div
            className={cnTw('h-[12px] w-[2px] shrink-0 rounded-tl-[100px] rounded-tr-[100px]', {
              'bg-text-primary': !state.hasSelection ? state.isActive : state.hasSelection && state.isSelected,
              'bg-gray-300': !state.hasSelection ? !state.isActive : !state.hasSelection || !state.isSelected,
            })}
          />
        </>
      )}
    </button>
  );
});

Segment.displayName = 'Segment';
