import { type PointerEvent, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { getGridMetrics } from '../lib/grid-metrics';
import { GRID_COLUMNS } from '../lib/layout-engine';

import { useWidgetSortable } from './WidgetSortableContext';

export const WidgetResizeHandle = () => {
  const { t } = useI18n();
  const ctx = useWidgetSortable();
  const start = useRef<{
    px: number;
    py: number;
    w: number;
    h: number;
    colStride: number;
    rowStride: number;
  } | null>(null);

  if (!ctx) return null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const cell = (e.currentTarget.closest('[data-widget-cell]') ?? e.currentTarget.parentElement) as HTMLElement | null;
    const grid = cell?.parentElement;
    // A drag of one column's worth of pixels must grow the widget by exactly
    // one column, and a column step is a column *plus its gap*.
    const { colStride, rowStride } = grid ? getGridMetrics(grid) : { colStride: 1, rowStride: 1 };
    start.current = { px: e.clientX, py: e.clientY, w: ctx.rect.w, h: ctx.rect.h, colStride, rowStride };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const { px, py, w, h, colStride, rowStride } = start.current;
    const dW = Math.round((e.clientX - px) / colStride);
    const dH = Math.round((e.clientY - py) / rowStride);
    // A widget cannot grow past the right edge of the grid, and the preview has
    // to say so while the pointer is still moving — clamping only on commit
    // showed a width the drop then silently took back.
    const availableW = GRID_COLUMNS - ctx.rect.x;
    const nextW = Math.max(ctx.minSize.w, Math.min(availableW, ctx.maxSize.w, w + dW));
    const nextH = Math.max(ctx.minSize.h, Math.min(ctx.maxSize.h, h + dH));
    ctx.resizePreview({ w: nextW, h: nextH });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    ctx.resizeCommit();
    start.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      role="slider"
      aria-label={t('dashboard.resizeWidget')}
      tabIndex={-1}
      className="absolute right-0.5 bottom-0.5 z-10 h-4 w-4 cursor-se-resize rounded-sm bg-primary-button-background-default/40 hover:bg-primary-button-background-default/70"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" className="text-white" fill="currentColor">
        <circle cx="11" cy="11" r="1" />
        <circle cx="11" cy="7" r="1" />
        <circle cx="7" cy="11" r="1" />
      </svg>
    </div>
  );
};
