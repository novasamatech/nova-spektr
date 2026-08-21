import { type CSSProperties } from 'react';

import { cnTw } from '@/shared/lib/utils';

export type ResizableColumn = 'operation' | 'value' | 'submitter' | 'initiator' | 'status' | 'actions';
export type ColumnWidths = Record<ResizableColumn, number>;

/**
 * Every resizable column, in visual order — iterate this instead of casting
 * `Object.keys`.
 */
export const RESIZABLE_COLUMNS: readonly ResizableColumn[] = [
  'operation',
  'value',
  'submitter',
  'initiator',
  'status',
  'actions',
];

/**
 * Columns the user can switch off from the header's settings menu. Operation is
 * not toggleable — a row without it has nothing to identify it by.
 */
export type ToggleableColumn = 'value' | 'submitter' | 'initiator' | 'description' | 'status' | 'actions';
export type ColumnVisibility = Record<ToggleableColumn, boolean>;

export const TOGGLEABLE_COLUMNS: readonly ToggleableColumn[] = [
  'value',
  'submitter',
  'initiator',
  'description',
  'status',
  'actions',
];

export const COLUMN_DEFAULT_WIDTHS: ColumnWidths = {
  operation: 240,
  value: 140,
  submitter: 180,
  initiator: 180,
  status: 110,
  actions: 168,
};
export const COLUMN_MIN_WIDTHS: ColumnWidths = {
  operation: 180,
  value: 120,
  submitter: 140,
  initiator: 140,
  status: 90,
  actions: 120,
};
export const COLUMN_MAX_WIDTHS: ColumnWidths = {
  operation: 440,
  value: 300,
  submitter: 440,
  initiator: 440,
  status: 220,
  actions: 320,
};
/** Double-click autofit targets — wide enough for the longest realistic value. */
export const COLUMN_FIT_WIDTHS: ColumnWidths = {
  operation: 268,
  value: 164,
  submitter: 304,
  initiator: 304,
  status: 110,
  actions: 168,
};
/** The Initiator column only renders at this viewport width (Tailwind `2xl`). */
export const INITIATOR_COLUMN_MEDIA_QUERY = '(min-width: 1536px)';

/** `gap-x-2` between cells. */
const CELL_GAP = 8;
/**
 * The `w-4` cell closing the row (chevron on rows, settings menu in the
 * header).
 */
const CHEVRON_WIDTH = 16;
/**
 * Trailing cells — status and actions when visible, plus the always-present
 * chevron slot, each preceded by a gap.
 */
const getTrailingWidth = (widths: ColumnWidths, visibility: ColumnVisibility) =>
  (visibility.status ? CELL_GAP + widths.status : 0) +
  (visibility.actions ? CELL_GAP + widths.actions : 0) +
  CELL_GAP +
  CHEVRON_WIDTH;
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

/** Operation, plus the Value cell riding along inside the same block when shown. */
export const getLeftBlockWidth = (widths: ColumnWidths, visibility: ColumnVisibility) =>
  widths.operation + (visibility.value ? CELL_GAP + widths.value : 0);

/**
 * Inline style for a fixed-width cell; flex-basis keeps it from shrinking in
 * the flex row.
 */
export const getColumnStyle = (width: number): CSSProperties => ({ width, flex: `0 0 ${width}px` });

/**
 * Minimum list width for the current column widths — hidden columns don't
 * count. Widening past the window falls back to horizontal scroll instead of
 * clipping rows.
 */
export const getOperationsMinWidth = (widths: ColumnWidths, visibility: ColumnVisibility) =>
  Math.max(
    MIN_WIDTH_FLOOR,
    ROW_PADDING +
      getLeftBlockWidth(widths, visibility) +
      (visibility.submitter ? CELL_GAP + widths.submitter : 0) +
      (visibility.initiator ? CELL_GAP + widths.initiator : 0) +
      (visibility.description ? CELL_GAP + DESCRIPTION_FLOOR : 0) +
      getTrailingWidth(widths, visibility),
  );

export const operationColumns = {
  /** Width comes from `getColumnStyle(getLeftBlockWidth(widths, visibility))`. */
  leftBlock: 'shrink-0',
  titleCell: 'flex-1 min-w-0',
  /** Width comes from `getColumnStyle(widths.value)`. */
  value: 'shrink-0',
  /** Width comes from `getColumnStyle(widths.submitter)`. */
  submitter: 'shrink-0',
  /**
   * Rendered only when `visibility.initiator` says so (its default follows
   * `INITIATOR_COLUMN_MEDIA_QUERY`); width comes from
   * `getColumnStyle(widths.initiator)`.
   */
  initiator: 'shrink-0',
  description: 'flex-1 min-w-0 pl-4',
  /**
   * Stands in for a hidden Description so the trailing columns keep their place
   * at the row's right edge.
   */
  descriptionSpacer: 'min-w-0 flex-1',
  /** Width comes from `getColumnStyle(widths.status)`. */
  status: 'shrink-0',
  /** Width comes from `getColumnStyle(widths.actions)`. */
  actions: 'shrink-0',
  chevron: 'w-4 shrink-0',
} as const;

/**
 * Hairline on the left edge of a header cell, drawn in the middle of the 8px
 * gap. Only the header marks column boundaries — rows stay clean cards.
 */
export const HEADER_SEPARATOR_CLASS =
  'relative before:absolute before:-left-1 before:top-1.5 before:bottom-1.5 before:w-px before:bg-divider';

export const ROW_HEIGHT = 68;
// Vertical gap between operation cards; matches the `pb-1.5` on each virtualized row.
export const ROW_GAP = 6;
// Section header estimate: 16px top padding + 20px content + 6px bottom padding.
export const SECTION_HEADER_HEIGHT = 42;
// Dashed "no operations" placeholder box inside an empty section, and its virtualized slot (box + row gap).
export const EMPTY_SECTION_BOX_HEIGHT = 60;
export const EMPTY_SECTION_HEIGHT = EMPTY_SECTION_BOX_HEIGHT + ROW_GAP;

/**
 * Fixed-width columns rendered as plain cells — Operation is the left block
 * (`getLeftBlockProps`), not a cell of its own.
 */
type CellColumn = Exclude<ResizableColumn, 'operation'>;
/**
 * Every column a pointer can rest on; the left Operation+Value block counts as
 * Operation.
 */
export type HoverColumn = ResizableColumn | 'description';

/**
 * Column hover is one DOM attribute on the scroller, not React state: cells are
 * flex children of their own rows, so no `:hover` can span a column, and a
 * store would re-render every visible row on each pointer move. The scroller
 * carries `TABLE_GROUP_CLASS` and gets `data-hovered-column="<column>"` from
 * `column-hover.ts`; each cell carries `data-column` and the matching
 * `group-data-[hovered-column=…]/table:` class, so the browser repaints only
 * the cells of that column.
 */
export const HOVERED_COLUMN_ATTRIBUTE = 'data-hovered-column';
export const CELL_COLUMN_ATTRIBUTE = 'data-column';
export const TABLE_GROUP_CLASS = 'group/table';
// Full literal strings — Tailwind only generates the classes it can see in the source.
const COLUMN_HOVER_CLASS: Record<HoverColumn, string> = {
  operation: 'group-data-[hovered-column=operation]/table:bg-hover',
  value: 'group-data-[hovered-column=value]/table:bg-hover',
  submitter: 'group-data-[hovered-column=submitter]/table:bg-hover',
  initiator: 'group-data-[hovered-column=initiator]/table:bg-hover',
  description: 'group-data-[hovered-column=description]/table:bg-hover',
  status: 'group-data-[hovered-column=status]/table:bg-hover',
  actions: 'group-data-[hovered-column=actions]/table:bg-hover',
};

type HoverableProps = { className: string; [CELL_COLUMN_ATTRIBUTE]: HoverColumn };
type RowProps = { className: string; style: CSSProperties };
type CellProps = HoverableProps & { style: CSSProperties };

/**
 * Marks an element as a cell of `column` for the column-hover highlight: the
 * `data-column` the scroller's pointer handler reads, plus the class that
 * paints the cell while that column is hovered.
 */
export const getHoverableProps = (column: HoverColumn, className?: string): HoverableProps => ({
  className: cnTw(COLUMN_HOVER_CLASS[column], className),
  [CELL_COLUMN_ATTRIBUTE]: column,
});

/** A row cell fills the row height and centres its content vertically. */
const ROW_CELL_CLASS = 'flex h-full items-center';

/**
 * The strip of cells inside an operation or draft row; its height is the one
 * the virtualizer measures with.
 */
export const getRowProps = (className?: string): RowProps => ({
  className: cnTw('flex w-full items-center gap-x-2 overflow-hidden', className),
  style: { height: ROW_HEIGHT },
});

/** Operation cell — with the Value cell riding along inside it when shown. */
export const getLeftBlockProps = (
  widths: ColumnWidths,
  visibility: ColumnVisibility,
  className?: string,
): CellProps => ({
  ...getHoverableProps('operation', cnTw(operationColumns.leftBlock, ROW_CELL_CLASS, className)),
  style: getColumnStyle(getLeftBlockWidth(widths, visibility)),
});

/** A fixed-width row cell; `className` adds the per-column alignment. */
export const getCellProps = (column: CellColumn, widths: ColumnWidths, className?: string): CellProps => ({
  ...getHoverableProps(column, cnTw(operationColumns[column], ROW_CELL_CLASS, className)),
  style: getColumnStyle(widths[column]),
});

/**
 * The flexible Description cell (row or header); `className` adds the context's
 * own classes.
 */
export const getDescriptionCellProps = (className?: string): HoverableProps =>
  getHoverableProps('description', cnTw(operationColumns.description, className));

/**
 * The header caption over a fixed-width column: the left hairline, no
 * row-height stretch.
 */
export const getHeaderCellProps = (column: CellColumn, widths: ColumnWidths, className?: string): CellProps => ({
  ...getHoverableProps(column, cnTw(operationColumns[column], HEADER_SEPARATOR_CLASS, 'flex', className)),
  style: getColumnStyle(widths[column]),
});
