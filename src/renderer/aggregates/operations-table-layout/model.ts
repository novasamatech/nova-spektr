import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import {
  type ColumnVisibility,
  type ColumnWidths,
  type ResizableColumn,
  type ToggleableColumn,
  COLUMN_DEFAULT_WIDTHS,
  COLUMN_FIT_WIDTHS,
  RESIZABLE_COLUMNS,
  TOGGLEABLE_COLUMNS,
  clampColumnWidth,
} from '@/shared/ui/operations-table-layout';

const columnResized = createEvent<{ column: ResizableColumn; width: number }>();
const columnAutofit = createEvent<ResizableColumn>();
const resizeStarted = createEvent<ResizableColumn>();
const resizeEnded = createEvent();
/**
 * The caller passes the new effective value: the store only holds overrides, so
 * it cannot flip a column whose current state comes from a default.
 */
const columnVisibilityChanged = createEvent<{ column: ToggleableColumn; visible: boolean }>();
/** "Reset to defaults" — forgets both the widths and the visibility overrides. */
const layoutReset = createEvent();

const $columnWidths = createStore<ColumnWidths>(COLUMN_DEFAULT_WIDTHS)
  .on(columnResized, (widths, { column, width }) => ({ ...widths, [column]: clampColumnWidth(column, width) }))
  .on(columnAutofit, (widths, column) => ({ ...widths, [column]: COLUMN_FIT_WIDTHS[column] }))
  .reset(layoutReset);

/**
 * Only the columns the user decided about. Everything else falls back to its
 * default in `useOperationColumnVisibility` — which keeps Initiator's default
 * tied to the viewport breakpoint until the user overrides it.
 */
const $visibilityOverrides = createStore<Partial<ColumnVisibility>>({})
  .on(columnVisibilityChanged, (overrides, { column, visible }) => ({ ...overrides, [column]: visible }))
  .reset(layoutReset);

// Rows light up their column hairlines while a header handle is being dragged.
const $resizingColumn = createStore<ResizableColumn | null>(null)
  .on(resizeStarted, (_, column) => column)
  .reset(resizeEnded);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Stored widths may come from an older build (missing a column, e.g. `status`
 * and `actions` became resizable later) or be hand-edited to something out of
 * range or non-numeric. Fill missing columns with defaults, drop non-numbers,
 * and clamp the rest so a stored payload can never produce an invalid width.
 */
export const sanitizeColumnWidths = (stored: unknown): ColumnWidths => {
  const source = isRecord(stored) ? stored : {};

  const widthFor = (column: ResizableColumn): number => {
    const value = source[column];
    const numericWidth = typeof value === 'number' && Number.isFinite(value) ? value : COLUMN_DEFAULT_WIDTHS[column];

    return clampColumnWidth(column, numericWidth);
  };

  const widths = { ...COLUMN_DEFAULT_WIDTHS };
  for (const column of RESIZABLE_COLUMNS) {
    widths[column] = widthFor(column);
  }

  return widths;
};

/**
 * Keeps only known columns carrying an actual boolean; anything else is not a
 * decision.
 */
export const sanitizeColumnVisibility = (stored: unknown): Partial<ColumnVisibility> => {
  const source = isRecord(stored) ? stored : {};
  const overrides: Partial<ColumnVisibility> = {};

  for (const column of TOGGLEABLE_COLUMNS) {
    const value = source[column];
    if (typeof value === 'boolean') {
      overrides[column] = value;
    }
  }

  return overrides;
};

// A stored value from an older build or a hand-edited one is merged over the
// defaults and clamped to each column's range.
persist({
  key: 'operations-table-column-widths',
  store: $columnWidths,
  sync: true,
  deserialize: raw => sanitizeColumnWidths(JSON.parse(raw)),
});

persist({
  key: 'operations-table-column-visibility',
  store: $visibilityOverrides,
  sync: true,
  deserialize: raw => sanitizeColumnVisibility(JSON.parse(raw)),
});

export const operationsTableLayoutModel = {
  $columnWidths,
  $resizingColumn,
  $visibilityOverrides,
  columnResized,
  columnAutofit,
  resizeStarted,
  resizeEnded,
  columnVisibilityChanged,
  layoutReset,
};
