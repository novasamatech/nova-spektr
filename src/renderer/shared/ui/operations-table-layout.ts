import { type CSSProperties } from 'react';

export type ResizableColumn = 'operation' | 'value' | 'submitter' | 'initiator';
export type ColumnWidths = Record<ResizableColumn, number>;

export const COLUMN_DEFAULT_WIDTHS: ColumnWidths = { operation: 240, value: 140, submitter: 180, initiator: 180 };
export const COLUMN_MIN_WIDTHS: ColumnWidths = { operation: 180, value: 120, submitter: 140, initiator: 140 };
export const COLUMN_MAX_WIDTHS: ColumnWidths = { operation: 440, value: 300, submitter: 440, initiator: 440 };
/** Double-click autofit targets — wide enough for the longest realistic value. */
export const COLUMN_FIT_WIDTHS: ColumnWidths = { operation: 268, value: 164, submitter: 304, initiator: 304 };
/** The Initiator column only renders at this viewport width (Tailwind `2xl`). */
export const INITIATOR_COLUMN_MEDIA_QUERY = '(min-width: 1536px)';

/** `gap-x-2` between cells. */
const CELL_GAP = 8;
/**
 * Fixed (non-resizable) trailing cells: status 110 + actions 168 + chevron 16,
 * each preceded by a gap.
 */
const TRAILING_WIDTH = CELL_GAP + 110 + CELL_GAP + 168 + CELL_GAP + 16;
/** Row horizontal padding (`px-4`) on both sides. */
const ROW_PADDING = 32;
/** Space the Description cell keeps at the default window so text still shows. */
const DESCRIPTION_FLOOR = 126;
/**
 * The 1372px default window with the 240px sidebar leaves 1100px; the list
 * floor keeps 40px of slack.
 */
const MIN_WIDTH_FLOOR = 1060;

export const clampColumnWidth = (column: ResizableColumn, width: number) =>
  Math.round(Math.min(COLUMN_MAX_WIDTHS[column], Math.max(COLUMN_MIN_WIDTHS[column], width)));

export const getLeftBlockWidth = (widths: ColumnWidths) => widths.operation + CELL_GAP + widths.value;

/**
 * Inline style for a fixed-width cell; flex-basis keeps it from shrinking in
 * the flex row.
 */
export const getColumnStyle = (width: number): CSSProperties => ({ width, flex: `0 0 ${width}px` });

/**
 * Minimum list width for the current column widths. The Initiator column counts
 * only while it is rendered (≥1536px). Widening past the window falls back to
 * horizontal scroll instead of clipping rows.
 */
export const getOperationsMinWidth = (widths: ColumnWidths, { showInitiator }: { showInitiator: boolean }) =>
  Math.max(
    MIN_WIDTH_FLOOR,
    ROW_PADDING +
      getLeftBlockWidth(widths) +
      CELL_GAP +
      widths.submitter +
      (showInitiator ? CELL_GAP + widths.initiator : 0) +
      CELL_GAP +
      DESCRIPTION_FLOOR +
      TRAILING_WIDTH,
  );

export const operationColumns = {
  /** Width comes from `getColumnStyle(getLeftBlockWidth(widths))`. */
  leftBlock: 'shrink-0',
  titleCell: 'flex-1 min-w-0',
  /** Width comes from `getColumnStyle(widths.value)`. */
  value: 'shrink-0',
  /** Width comes from `getColumnStyle(widths.submitter)`. */
  submitter: 'shrink-0',
  /**
   * Hidden below 2xl (≥1536px, `INITIATOR_COLUMN_MEDIA_QUERY`); width comes
   * from `getColumnStyle(widths.initiator)`.
   */
  initiator: 'hidden shrink-0 2xl:flex',
  description: 'flex-1 min-w-0 pl-4',
  status: 'w-[110px] shrink-0',
  actions: 'w-[168px] shrink-0',
  chevron: 'w-4 shrink-0',
} as const;

/**
 * Hairline on the left edge of a cell, drawn in the middle of the 8px gap. Rows
 * reveal it on hover (`group/row`) and while a column is being resized
 * (`group/list` + `data-resizing`); the header shows it permanently via
 * `HEADER_SEPARATOR_CLASS`.
 */
export const ROW_SEPARATOR_CLASS =
  'relative before:absolute before:-left-1 before:top-[13px] before:bottom-[13px] before:w-px before:bg-divider before:opacity-0 before:transition-opacity group-hover/row:before:opacity-100 group-data-[resizing=true]/list:before:opacity-100';
export const HEADER_SEPARATOR_CLASS =
  'relative before:absolute before:-left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-divider';

/**
 * Temporary: consumers are migrated to `getOperationsMinWidth` in the next
 * tasks.
 */
export const OPERATIONS_MIN_WIDTH = 'min-w-[1060px]';
export const ROW_HEIGHT = 68;
// Vertical gap between operation cards; matches the `pb-1.5` on each virtualized row.
export const ROW_GAP = 6;
// Section header estimate: 16px top padding + 20px content + 6px bottom padding.
export const SECTION_HEADER_HEIGHT = 42;
// Dashed "no operations" placeholder inside an empty section (60px box + row gap).
export const EMPTY_SECTION_HEIGHT = 60 + ROW_GAP;
