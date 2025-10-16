import { memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { type TimelineSegmentProps } from '../types';

export const TimelineSegment = memo(
  ({
    segment,
    index,
    segments,
    currentIndex,
    isActive,
    nextIsActive,
    isPartialProgress,
    isSelected,
    hasSelection,
    isSelectedBoundary,
    selectedSegmentId,
    bottomLabelPrefix,
    onSegmentClick,
  }: TimelineSegmentProps) => {
    const isLast = index === segments.length - 1;
    const width = `${segment.width}px`;

    return (
      <button
        type="button"
        className="relative flex shrink-0 cursor-pointer content-stretch items-end border-0 bg-transparent p-0 after:absolute after:top-0 after:left-0 after:h-[60px] after:w-full"
        style={{ width }}
        aria-label={`${bottomLabelPrefix} ${segment.id}: ${segment.title}`}
        onClick={() => onSegmentClick(segment.id)}
      >
        <div
          className={cnTw('h-[12px] w-[2px] shrink-0 rounded-tl-[100px] rounded-tr-[100px]', {
            'bg-text-primary': !hasSelection ? isActive : isSelectedBoundary,
            'bg-gray-300': !hasSelection ? !isActive : !isSelectedBoundary,
          })}
        />

        {!isLast && (
          <div className="relative h-[8px] min-h-px min-w-px flex-1 shrink-0 grow basis-0 bg-tab-background">
            {nextIsActive && !hasSelection && (
              <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', segment.color)} />
            )}
            {(() => {
              const shouldShowProgress =
                hasSelection &&
                (nextIsActive || isSelected) &&
                (!isPartialProgress || selectedSegmentId !== segments[currentIndex]?.id);

              return (
                shouldShowProgress && (
                  <div
                    className={cnTw('absolute top-0 right-0 left-0 h-[8px]', segment.color, {
                      'opacity-30': !isSelected,
                    })}
                  />
                )
              );
            })()}
            {(() => {
              const shouldShowSelectedProgress =
                hasSelection &&
                isSelected &&
                !nextIsActive &&
                (!isPartialProgress || selectedSegmentId !== segments[currentIndex]?.id);

              return (
                shouldShowSelectedProgress && (
                  <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', segment.color)} />
                )
              );
            })()}
            {isPartialProgress && currentIndex >= 0 && (
              <div
                className={cnTw('absolute top-0 left-0 h-[8px]', segments[currentIndex]?.color || 'bg-gray-300', {
                  'opacity-30': hasSelection && selectedSegmentId !== segments[currentIndex]?.id,
                })}
                style={{ width: `${segment.width / 2}px` }}
              />
            )}
          </div>
        )}

        {isLast && (
          <>
            <div className="relative h-[8px] min-h-px min-w-px flex-1 shrink-0 grow basis-0 bg-tab-background">
              {isActive && !hasSelection && (
                <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', segment.color)} />
              )}
              {(() => {
                const shouldShowActiveOrSelected = hasSelection && (isActive || isSelected);

                return (
                  shouldShowActiveOrSelected && (
                    <div
                      className={cnTw('absolute top-0 right-0 left-0 h-[8px]', segment.color, {
                        'opacity-30': !isSelected,
                      })}
                    />
                  )
                );
              })()}
              {(() => {
                const shouldShowSelectedOnly = hasSelection && isSelected && !isActive;

                return (
                  shouldShowSelectedOnly && (
                    <div className={cnTw('absolute top-0 right-0 left-0 h-[8px]', segment.color)} />
                  )
                );
              })()}
            </div>
            <div
              className={cnTw('h-[12px] w-[2px] shrink-0 rounded-tl-[100px] rounded-tr-[100px]', {
                'bg-text-primary': !hasSelection
                  ? isActive
                  : hasSelection && segments.findIndex(s => s.id === selectedSegmentId) === index,
                'bg-gray-300': !hasSelection
                  ? !isActive
                  : !hasSelection || segments.findIndex(s => s.id === selectedSegmentId) !== index,
              })}
            />
          </>
        )}
      </button>
    );
  },
);

TimelineSegment.displayName = 'TimelineSegment';
