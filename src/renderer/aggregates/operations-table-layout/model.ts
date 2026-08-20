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

// A stored value from an older build may be missing a column (e.g. `initiator`
// added later) — merge over the defaults so a partial payload never produces
// `undefined` widths.
persist({
  key: 'operations-table-column-widths',
  store: $columnWidths,
  sync: true,
  deserialize: raw => ({ ...COLUMN_DEFAULT_WIDTHS, ...JSON.parse(raw) }),
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
