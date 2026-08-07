import { type ReactNode } from 'react';

/**
 * How a column may be narrowed from its header.
 *
 * - `text` — substring over the string the cell renders;
 * - `enum` — tick-list of the distinct values present in the data;
 * - `range` — numeric min/max over {@link DataTableColumn.value}.
 */
export type DataTableFilterKind = 'text' | 'enum' | 'range';

export type DataTableColumn<T> = {
  /** Stable id. Also the key the sort and the filter state are stored under. */
  id: string;
  title: ReactNode;
  width?: string;
  sortable?: boolean;
  /** Omit for a column that cannot be filtered (actions, icons). */
  filter?: DataTableFilterKind;
  /**
   * The string the user actually reads in this cell.
   *
   * Search, the `text`/`enum` filters and the CSV export all run over this, so
   * a resolved account name or a prefixed address must be supplied here rather
   * than the raw record field — a query typed from what is on screen has to
   * match what is on screen.
   */
  text?: (row: T) => string;
  /**
   * The number behind the cell. Drives sorting and the `range` filter; `null`
   * for a row whose value is unknown, which always sorts last.
   */
  value?: (row: T) => number | null;
  /**
   * Full-precision value for the CSV. Falls back to {@link text} — the screen
   * abbreviates, a spreadsheet is where people do arithmetic.
   */
  exportValue?: (row: T) => string;
  render: (row: T) => ReactNode;
  /**
   * Presentational column (chevrons, access-mode glyphs). Excluded from search
   * and from the export.
   */
  decorative?: boolean;
};

export type DataTableRange = {
  min: number | null;
  max: number | null;
};

export type DataTableFilterState = {
  /** ColumnId → substring */
  text: Record<string, string>;
  /** ColumnId → the display strings that stay visible */
  enum: Record<string, string[]>;
  /** ColumnId → numeric bounds */
  range: Record<string, DataTableRange>;
};

export const EMPTY_FILTER_STATE: DataTableFilterState = { text: {}, enum: {}, range: {} };
