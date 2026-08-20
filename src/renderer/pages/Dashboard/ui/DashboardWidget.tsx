import { type ReactNode, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';

import { WidgetResizeHandle } from './WidgetResizeHandle';
import { useWidgetSortable } from './WidgetSortableContext';

type Props = {
  children: ReactNode;
  className?: string;
  card?: boolean;
  /**
   * Whether content taller than the cell scrolls. Widgets sized from the cell
   * (a chart filling its box) pass `false` and must fit at every size they
   * allow: what does not fit is clipped, with nothing to scroll to.
   */
  scroll?: boolean;
};

const CARD_CLASS = 'rounded-lg border border-token-container-border bg-white p-4 shadow-card-shadow';

/**
 * Vertical only, on purpose: `overflow-y: auto` alone computes the x axis to
 * `auto`, and then a child a fraction of a pixel too wide (Recharts rounds its
 * width up) raises a horizontal scrollbar, which steals height, which raises
 * the vertical one, which steals width — the pair then blinks forever.
 */
const SCROLL_CLASS = 'overflow-x-hidden overflow-y-auto';

export const DashboardWidget = memo(({ children, className, card = true, scroll = true }: Props) => {
  const { t } = useI18n();
  const ctx = useWidgetSortable();
  const rect = ctx?.rect;

  return (
    <div
      ref={ctx?.sortableRef}
      data-widget-cell
      style={
        rect
          ? {
              gridColumn: `${rect.x + 1} / span ${rect.w}`,
              gridRow: `${rect.y + 1} / span ${rect.h}`,
            }
          : undefined
      }
      className={cnTw(
        'flex h-full min-h-0 flex-col',
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
          aria-label={t('dashboard.dragWidget')}
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
      <div className={cnTw('min-h-0 flex-1', scroll ? SCROLL_CLASS : 'overflow-hidden')}>{children}</div>
      {ctx?.editMode && rect && <WidgetResizeHandle />}
    </div>
  );
});
