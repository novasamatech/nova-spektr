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
} from './layout';

export const COLUMN_WIDTHS_STORAGE_KEY = 'operations-table-column-widths';
export const COLUMN_VISIBILITY_STORAGE_KEY = 'operations-table-column-visibility';
/**
 * `columnResized` fires on every `pointermove` of a drag; effector-storage
 * writes synchronously and each write raises a cross-window `storage` event, so
 * the widths are flushed to storage at most once per this window.
 */
const COLUMN_WIDTHS_PERSIST_MS = 300;

const columnResized = createEvent<{ column: ResizableColumn; width: number }>();
const columnAutofit = createEvent<ResizableColumn>();
const resizeStarted = createEvent();
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

// Set for the duration of a header-handle drag; the list suspends text
// selection while it is on so the pointer only resizes.
const $isResizing = createStore(false)
  .on(resizeStarted, () => true)
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
  key: COLUMN_WIDTHS_STORAGE_KEY,
  store: $columnWidths,
  sync: true,
  timeout: COLUMN_WIDTHS_PERSIST_MS,
  deserialize: raw => sanitizeColumnWidths(JSON.parse(raw)),
});

persist({
  key: COLUMN_VISIBILITY_STORAGE_KEY,
  store: $visibilityOverrides,
  sync: true,
  deserialize: raw => sanitizeColumnVisibility(JSON.parse(raw)),
});

export const operationsTableLayoutModel = {
  $columnWidths,
  $isResizing,
  $visibilityOverrides,
  columnResized,
  columnAutofit,
  resizeStarted,
  resizeEnded,
  columnVisibilityChanged,
  layoutReset,
};
