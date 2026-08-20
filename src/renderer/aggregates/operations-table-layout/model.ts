import { createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import {
  type ColumnWidths,
  type ResizableColumn,
  COLUMN_DEFAULT_WIDTHS,
  COLUMN_FIT_WIDTHS,
  clampColumnWidth,
} from '@/shared/ui/operations-table-layout';

const columnResized = createEvent<{ column: ResizableColumn; width: number }>();
const columnAutofit = createEvent<ResizableColumn>();
const widthsReset = createEvent();
const resizeStarted = createEvent<ResizableColumn>();
const resizeEnded = createEvent();

const $columnWidths = createStore<ColumnWidths>(COLUMN_DEFAULT_WIDTHS)
  .on(columnResized, (widths, { column, width }) => ({ ...widths, [column]: clampColumnWidth(column, width) }))
  .on(columnAutofit, (widths, column) => ({ ...widths, [column]: COLUMN_FIT_WIDTHS[column] }))
  .reset(widthsReset);

// Rows light up their column hairlines while a header handle is being dragged.
const $resizingColumn = createStore<ResizableColumn | null>(null)
  .on(resizeStarted, (_, column) => column)
  .reset(resizeEnded);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Stored widths may come from an older build (missing a column, e.g.
 * `initiator` added later) or be hand-edited to something out of range or
 * non-numeric. Fill missing columns with defaults, drop non-numbers, and clamp
 * the rest so a stored payload can never produce an invalid width.
 */
export const sanitizeColumnWidths = (stored: unknown): ColumnWidths => {
  const source = isRecord(stored) ? stored : {};

  const widthFor = (column: ResizableColumn): number => {
    const value = source[column];
    const numericWidth = typeof value === 'number' && Number.isFinite(value) ? value : COLUMN_DEFAULT_WIDTHS[column];
    return clampColumnWidth(column, numericWidth);
  };

  return {
    operation: widthFor('operation'),
    value: widthFor('value'),
    submitter: widthFor('submitter'),
    initiator: widthFor('initiator'),
  };
};

// A stored value from an older build or a hand-edited one is merged over the
// defaults and clamped to each column's range.
persist({
  key: 'operations-table-column-widths',
  store: $columnWidths,
  sync: true,
  deserialize: raw => sanitizeColumnWidths(JSON.parse(raw)),
});

export const operationsTableLayoutModel = {
  $columnWidths,
  $resizingColumn,
  columnResized,
  columnAutofit,
  widthsReset,
  resizeStarted,
  resizeEnded,
};
