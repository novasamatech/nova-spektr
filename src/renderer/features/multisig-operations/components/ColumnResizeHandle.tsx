import { type PointerEvent, useRef } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type ResizableColumn } from '@/shared/ui/operations-table-layout';
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

/**
 * 10px-wide grab zone on a header cell's right edge. Invisible until hovered;
 * the line turns accent while dragging. Pointer capture keeps the drag alive
 * when the cursor leaves the handle. Clicks are swallowed so the cell's sort
 * does not toggle.
 */
export const ColumnResizeHandle = ({ column, width, className }: Props) => {
  const { t } = useI18n();
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    drag.current = { startX: event.clientX, startWidth: width };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    operationsTableLayoutModel.resizeStarted(column);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    operationsTableLayoutModel.columnResized({
      column,
      width: drag.current.startWidth + event.clientX - drag.current.startX,
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    operationsTableLayoutModel.resizeEnded();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t(LABEL_KEYS[column])}
      title={t('operations.table.resizeHint')}
      className={cnTw(
        'group/handle absolute top-0 bottom-0 z-10 flex w-2.5 cursor-col-resize items-center justify-center',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => {
        event.stopPropagation();
        operationsTableLayoutModel.columnAutofit(column);
      }}
    >
      <span className="h-full w-px bg-transparent transition-colors group-hover/handle:bg-icon-accent group-active/handle:bg-icon-accent" />
    </div>
  );
};
