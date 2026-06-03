import { type ReactNode, memo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { ROW_HEIGHT_PX } from '../lib/layout-engine';

import { WidgetResizeHandle } from './WidgetResizeHandle';
import { useWidgetSortable } from './WidgetSortableContext';

type Props = {
  children: ReactNode;
  className?: string;
  card?: boolean;
};

const COL_SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
};

const CARD_CLASS = 'rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

export const DashboardWidget = memo(({ children, className, card = true }: Props) => {
  const ctx = useWidgetSortable();
  const rect = ctx?.rect;

  return (
    <div
      ref={ctx?.sortableRef}
      data-widget-cell
      style={rect ? { gridRowEnd: `span ${rect.h}`, height: rect.h * ROW_HEIGHT_PX } : undefined}
      className={cnTw(
        rect ? COL_SPAN_CLASS[rect.w] : 'col-span-2',
        'flex min-h-0 flex-col',
        card && CARD_CLASS,
        ctx && 'relative transition-shadow duration-200',
        ctx?.editMode && 'ring-2 ring-primary-button-background-default/30',
        ctx?.isDragging && 'z-10 opacity-60',
        className,
      )}
    >
      {ctx?.editMode && (
        <button
          ref={ctx.handleRef}
          type="button"
          className="absolute -top-2.5 -left-2.5 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-primary-button-background-default text-white shadow-card-shadow active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {ctx?.editMode && rect && <WidgetResizeHandle />}
    </div>
  );
});
