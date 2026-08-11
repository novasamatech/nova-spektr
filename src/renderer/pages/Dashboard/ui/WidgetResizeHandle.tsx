import { type PointerEvent, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { GRID_COLUMNS, ROW_HEIGHT_PX } from '../lib/layout-engine';

import { useWidgetSortable } from './WidgetSortableContext';

export const WidgetResizeHandle = () => {
  const { t } = useI18n();
  const ctx = useWidgetSortable();
  const start = useRef<{ px: number; py: number; w: number; h: number; colWidth: number } | null>(null);

  if (!ctx) return null;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const cell = (e.currentTarget.closest('[data-widget-cell]') ?? e.currentTarget.parentElement) as HTMLElement | null;
    const grid = cell?.parentElement;
    const colWidth = grid ? grid.clientWidth / GRID_COLUMNS : 1;
    start.current = { px: e.clientX, py: e.clientY, w: ctx.rect.w, h: ctx.rect.h, colWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const { px, py, w, h, colWidth } = start.current;
    const dW = Math.round((e.clientX - px) / colWidth);
    const dH = Math.round((e.clientY - py) / ROW_HEIGHT_PX);
    const nextW = Math.max(ctx.minSize.w, Math.min(GRID_COLUMNS, w + dW));
    const nextH = Math.max(ctx.minSize.h, h + dH);
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
