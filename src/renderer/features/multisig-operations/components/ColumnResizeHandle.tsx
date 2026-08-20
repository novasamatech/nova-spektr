import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type ResizableColumn, COLUMN_MAX_WIDTHS, COLUMN_MIN_WIDTHS } from '@/shared/ui/operations-table-layout';
import { operationsTableLayoutModel } from '@/aggregates/operations-table-layout';

type Props = {
  column: ResizableColumn;
  /** Current width — the drag applies its delta to this value. */
  width: number;
  /** Positions the handle over the gap midpoint, e.g. `-right-[9px]`. */
  className?: string;
};

const LABEL_KEYS: Record<ResizableColumn, string> = {
  operation: 'operations.table.resizeOperation',
  value: 'operations.table.resizeValue',
  submitter: 'operations.table.resizeSubmitter',
  initiator: 'operations.table.resizeInitiator',
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
 * 10px-wide grab zone on a header cell's right edge. Invisible until hovered;
 * the line turns accent while dragging. Pointer capture keeps the drag alive
 * when the cursor leaves the handle. Clicks are swallowed so the cell's sort
 * does not toggle. Also keyboard-operable: ←/→ resize by 8px (32px with Shift),
 * Home shrinks to the column minimum, End autofits.
 */
export const ColumnResizeHandle = ({ column, width, className }: Props) => {
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
  // leave the drag state stuck: hairlines lit, list text unselectable.
  useEffect(() => {
    return () => finishDrag();
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A second pointerdown while a drag is already live (second finger, secondary
    // button) must not leak the previous window `pointerup` listener or pointer capture.
    finishDrag();

    event.preventDefault();
    event.stopPropagation();

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

    operationsTableLayoutModel.resizeStarted(column);
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
      aria-label={t(LABEL_KEYS[column])}
      aria-valuenow={width}
      aria-valuemin={COLUMN_MIN_WIDTHS[column]}
      aria-valuemax={COLUMN_MAX_WIDTHS[column]}
      title={t('operations.table.resizeHint')}
      className={cnTw(
        'group/handle absolute top-0 bottom-0 z-10 flex w-2.5 cursor-col-resize items-center justify-center',
        'focus-visible:outline-2 focus-visible:outline-icon-accent',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onKeyDown={handleKeyDown}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => {
        event.stopPropagation();
        operationsTableLayoutModel.columnAutofit(column);
      }}
    >
      <span className="h-full w-px bg-transparent transition-colors group-hover/handle:bg-icon-accent group-focus-visible/handle:bg-icon-accent group-active/handle:bg-icon-accent" />
    </div>
  );
};
