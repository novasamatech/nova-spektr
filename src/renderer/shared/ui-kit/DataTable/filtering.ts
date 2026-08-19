import { type TableSort } from '../Table';

import { type DataTableColumn, type DataTableFilterState, EMPTY_FILTER_STATE } from './types';

const columnText = <T>(column: DataTableColumn<T>, row: T): string => column.text?.(row) ?? '';

/**
 * The distinct display strings an `enum` column carries, in alphabetical order.
 *
 * Built from the rows themselves rather than from a hard-coded list, so a
 * filter never offers an option that cannot match anything, and never hides one
 * the data does contain.
 */
export const enumOptions = <T>(rows: T[], column: DataTableColumn<T>): string[] => {
  const seen = new Set<string>();
  for (const row of rows) {
    const text = columnText(column, row);
    if (text) seen.add(text);
  }

  return [...seen].sort((a, b) => a.localeCompare(b));
};

/**
 * Rows the query matches, **in their original order**.
 *
 * Deliberately a predicate rather than `performSearch`: these tables are
 * ordered by something that means something (stake, fiat value), and re-ranking
 * them by match weight would destroy the ordering the user is reading. Matching
 * runs over the columns' display strings, which is what the user typed from.
 */
export const searchRows = <T>(rows: T[], columns: DataTableColumn<T>[], query: string): T[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return rows;

  const searchable = columns.filter(column => !column.decorative && column.text);

  return rows.filter(row => searchable.some(column => columnText(column, row).toLowerCase().includes(trimmed)));
};

export const filterRows = <T>(rows: T[], columns: DataTableColumn<T>[], state: DataTableFilterState): T[] => {
  const byId = new Map(columns.map(column => [column.id, column]));

  const textEntries = Object.entries(state.text).filter(([, query]) => query.trim() !== '');
  const enumEntries = Object.entries(state.enum).filter(([, selected]) => selected.length > 0);
  const rangeEntries = Object.entries(state.range).filter(([, range]) => range.min !== null || range.max !== null);

  if (textEntries.length === 0 && enumEntries.length === 0 && rangeEntries.length === 0) {
    return rows;
  }

  return rows.filter(row => {
    for (const [id, query] of textEntries) {
      const column = byId.get(id);
      if (!column) continue;
      if (!columnText(column, row).toLowerCase().includes(query.trim().toLowerCase())) return false;
    }

    for (const [id, selected] of enumEntries) {
      const column = byId.get(id);
      if (!column) continue;
      if (!selected.includes(columnText(column, row))) return false;
    }

    for (const [id, range] of rangeEntries) {
      const column = byId.get(id);
      if (!column) continue;

      const value = column.value?.(row) ?? null;
      // A row whose value is unknown is not evidence of anything, so a bound
      // never claims it — it drops out rather than passing as a zero.
      if (value === null) return false;
      if (range.min !== null && value < range.min) return false;
      if (range.max !== null && value > range.max) return false;
    }

    return true;
  });
};

/**
 * Sorts by the column's numeric `value` when it has one, by its display string
 * otherwise. Rows with an unknown value sort last in **both** directions: they
 * say "not read yet", and parking them at the top of a descending sort would
 * read as "these are the biggest".
 */
export const sortRows = <T>(rows: T[], columns: DataTableColumn<T>[], sort: TableSort | null): T[] => {
  if (!sort) return rows;

  const column = columns.find(c => c.id === sort.column);
  if (!column?.sortable) return rows;

  const sign = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    // Unknowns are settled before the direction is applied, so they sink in
    // both directions. Leaving it to `compare` and multiplying its result by
    // `sign` floated every `—` row to the top of a descending sort — which is
    // most rows on a column like Self stake.
    if (column.value) {
      const left = column.value(a);
      const right = column.value(b);

      if (left === null || right === null) {
        if (left === null && right === null) return 0;

        return left === null ? 1 : -1;
      }

      if (!column.compare) return (left - right) * sign;
    }

    if (column.compare) {
      return column.compare(a, b) * sign;
    }

    return columnText(column, a).localeCompare(columnText(column, b)) * sign;
  });
};

export const countActiveFilters = (state: DataTableFilterState): number => {
  const text = Object.values(state.text).filter(query => query.trim() !== '').length;
  const enums = Object.values(state.enum).filter(selected => selected.length > 0).length;
  const ranges = Object.values(state.range).filter(range => range.min !== null || range.max !== null).length;

  return text + enums + ranges;
};

export const isColumnFiltered = <T>(state: DataTableFilterState, column: DataTableColumn<T>): boolean => {
  switch (column.filter) {
    case 'text':
      return (state.text[column.id] ?? '').trim() !== '';
    case 'enum':
      return (state.enum[column.id] ?? []).length > 0;
    case 'range': {
      const range = state.range[column.id];

      return Boolean(range && (range.min !== null || range.max !== null));
    }
    default:
      return false;
  }
};

export const emptyFilterState = (): DataTableFilterState => structuredClone(EMPTY_FILTER_STATE);
