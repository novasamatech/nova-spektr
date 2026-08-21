import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import {
  type ResizableColumn,
  COLUMN_MAX_WIDTHS,
  COLUMN_MIN_WIDTHS,
  operationsTableLayoutModel,
} from '@/aggregates/operations-table-layout';

type Props = {
  column: ResizableColumn;
  /** Current width — the drag applies its delta to this value. */
  width: number;
  /**
   * The column's caption as shown in the header; named in the handle's
   * accessible label.
   */
  columnLabel: string;
};

/** Arrow-key resize step; Shift switches to the coarse one. */
const KEY_STEP = 8;
const KEY_STEP_LARGE = 32;

type DragState = {
  startX: number;
  startWidth: number;
  /** The horizontally scrolling list wrapper, when the handle sits inside one. */
  scroller: HTMLElement | null;
  startScrollLeft: number;
};

/**
 * 16px-wide grab zone centred on the gap after a header cell (4px into the 8px
 * gap). Invisible until hovered; the line turns accent while dragging. Pointer
 * capture keeps the drag alive when the cursor leaves the handle. Also
 * keyboard-operable: ←/→ resize by 8px (32px with Shift), Home shrinks to the
 * column minimum, End autofits.
 */
export const ColumnResizeHandle = ({ column, width, columnLabel }: Props) => {
  const { t } = useI18n();
  const drag = useRef<DragState | null>(null);
  /** Removes the window-level safety listener and releases the pointer capture. */
  const teardown = useRef<(() => void) | null>(null);

  const finishDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    teardown.current?.();
    teardown.current = null;
    operationsTableLayoutModel.resizeEnded();
  };

  // Unmounting mid-drag (a filter change re-renders the header) would otherwise
  // leave the drag state stuck and the list text unselectable.
  useEffect(() => {
    return () => finishDrag();
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Only the primary button drags; a right or middle click is not a resize.
    if (event.button !== 0) return;

    // A second pointerdown while a drag is already live (second finger) must not
    // leak the previous window `pointerup` listener or pointer capture.
    finishDrag();

    event.preventDefault();

    const target = event.currentTarget;
    const pointerId = event.pointerId;
    // The header scrolls with the list: dragging past the viewport edge scrolls
    // the wrapper, and that scroll has to count towards the delta as well.
    const scroller = target.closest<HTMLElement>('[data-operations-scroller]');
    drag.current = {
      startX: event.clientX,
      startWidth: width,
      scroller,
      startScrollLeft: scroller?.scrollLeft ?? 0,
    };
    target.setPointerCapture?.(pointerId);

    // Safety net for a pointerup that never reaches the handle (released outside
    // the window, or a capture the browser refused to grant).
    const onWindowPointerUp = () => finishDrag();
    window.addEventListener('pointerup', onWindowPointerUp);
    teardown.current = () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      if (target.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    };

    operationsTableLayoutModel.resizeStarted();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;

    const scrollDelta = (state.scroller?.scrollLeft ?? 0) - state.startScrollLeft;
    operationsTableLayoutModel.columnResized({
      column,
      width: state.startWidth + (event.clientX - state.startX) + scrollDelta,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;

    switch (event.key) {
      case 'ArrowLeft':
        operationsTableLayoutModel.columnResized({ column, width: width - step });
        break;
      case 'ArrowRight':
        operationsTableLayoutModel.columnResized({ column, width: width + step });
        break;
      case 'Home':
        operationsTableLayoutModel.columnResized({ column, width: COLUMN_MIN_WIDTHS[column] });
        break;
      case 'End':
        operationsTableLayoutModel.columnAutofit(column);
        break;
      default:
        return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={t('operations.table.resizeColumn', { column: columnLabel })}
      aria-valuenow={width}
      aria-valuemin={COLUMN_MIN_WIDTHS[column]}
      aria-valuemax={COLUMN_MAX_WIDTHS[column]}
      title={t('operations.table.resizeHint')}
      className={cnTw(
        // 16px wide and stretched over the header's vertical padding so the boundary is easy to grab;
        // `touch-none` keeps touch panning from cancelling the pointer capture mid-drag.
        'group/handle absolute -inset-y-2 -right-3 z-10 flex w-4 cursor-col-resize touch-none items-center justify-center',
        'focus-visible:outline-2 focus-visible:outline-icon-accent',
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => operationsTableLayoutModel.columnAutofit(column)}
    >
      <span className="h-full w-px bg-transparent transition-colors group-hover/handle:bg-icon-accent group-focus-visible/handle:bg-icon-accent group-active/handle:bg-icon-accent" />
    </div>
  );
};
