import { type ReactNode, isValidElement, memo, useMemo, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';

import './Table.css';

/**
 * @deprecated Only the legacy `onSort` callback speaks this shape. Prefer
 *   `TableSort`, which keeps the column and direction together and expresses
 *   "no sort" as a `null` `TableSort` rather than a nullable direction.
 */
export type SortDirection = 'asc' | 'desc' | null;

export type TableSort = {
  column: string;
  direction: 'asc' | 'desc';
};

export type Column<T> = {
  key: keyof T;
  title: ReactNode;
  sortable?: boolean;
  width?: string;
  render?: (value: T[keyof T], item: T) => ReactNode;
};

export type TableRowProps = {
  disabled?: boolean;
  selected?: boolean;
};

const CELL_ALIGN_STYLES = {
  top: 'align-top',
  middle: 'align-middle',
  bottom: 'align-bottom',
} as const;

export type CellAlign = keyof typeof CELL_ALIGN_STYLES;

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  className?: string;
  cellAlign?: CellAlign;
  /**
   * Pins the header row while the rows scroll under it.
   *
   * The table does not become the scroll container — the caller's does, which
   * is why this also drops the container's own `overflow`. An element with
   * `overflow: hidden` is a scrollport, and a sticky header inside one sticks
   * to _that_ box, which then scrolls away with the rows and pins nothing.
   */
  stickyHeader?: boolean;
  /**
   * Controlled sort state. When provided, the table does not sort data itself —
   * data is expected to arrive pre-sorted. Use together with `onSortChange`.
   */
  sort?: TableSort | null;
  /** Initial sort for uncontrolled mode. Ignored when `sort` is provided. */
  defaultSort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  /** Stable row key. Falls back to the row index. */
  getRowKey?: (item: T) => string;
  /** Per-row visual state. */
  rowProps?: (item: T) => TableRowProps;
  /**
   * @deprecated Use `onSortChange`, which reports the whole `TableSort` and
   *   pairs with the controlled `sort` prop. Both callbacks still fire on every
   *   header click, so this one stays for backwards compatibility only.
   */
  onSort?: (key: keyof T, direction: SortDirection) => void;
  onRowClick?: (item: T, index: number) => void;
};

const TableComponent = <T,>({
  columns,
  data,
  className,
  cellAlign = 'middle',
  stickyHeader = false,
  sort,
  defaultSort,
  onSortChange,
  getRowKey,
  rowProps,
  onSort,
  onRowClick,
}: TableProps<T>) => {
  const isControlled = sort !== undefined;
  const [internalSort, setInternalSort] = useState<TableSort | null>(defaultSort ?? null);

  const activeSort = isControlled ? sort : internalSort;

  const handleSort = (key: keyof T) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    const columnId = String(key);

    let nextSort: TableSort | null = { column: columnId, direction: 'asc' };
    if (activeSort?.column === columnId && activeSort.direction === 'asc') {
      nextSort = { column: columnId, direction: 'desc' };
    } else if (activeSort?.column === columnId && activeSort.direction === 'desc') {
      nextSort = null;
    }

    if (!isControlled) {
      setInternalSort(nextSort);
    }
    onSortChange?.(nextSort);
    onSort?.(key, nextSort?.direction ?? null);
  };

  const sortedData = useMemo(() => {
    if (isControlled || !internalSort) return data;

    const sortColumn = columns.find(col => String(col.key) === internalSort.column);
    if (!sortColumn) return data;

    const sortKey = sortColumn.key;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;

      let comparison: number;

      // Handle boolean values
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
      } else {
        // Handle other types (strings, numbers)
        comparison = aValue < bValue ? -1 : 1;
      }

      return internalSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, columns, isControlled, internalSort]);

  return (
    <div className={cnTw('table-container', { 'table-container--sticky-header': stickyHeader }, className)}>
      <table className="table">
        <thead className="table-header">
          <tr>
            {columns.map(column => {
              const isActive = activeSort?.column === String(column.key);

              return (
                <th
                  key={String(column.key)}
                  className={cnTw('table-header-cell', {
                    'table-header-cell--sortable': column.sortable,
                    'table-header-cell--active': isActive,
                  })}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="table-header-content">
                    {isValidElement(column.title) ? column.title : <span>{column.title}</span>}
                    {column.sortable && (
                      <div className="table-sort-indicator">
                        {/* eslint-disable-next-line i18next/no-literal-string */}
                        {isActive && activeSort.direction === 'asc' && <span className="text-xs">▴</span>}
                        {/* eslint-disable-next-line i18next/no-literal-string */}
                        {isActive && activeSort.direction === 'desc' && <span className="text-xs">▾</span>}
                        {/* eslint-disable-next-line i18next/no-literal-string */}
                        {!isActive && <span className="text-xs opacity-30">⇅</span>}
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="table-body">
          {sortedData.map((item, index) => {
            const { disabled = false, selected = false } = rowProps?.(item) ?? {};

            return (
              <tr
                key={getRowKey ? getRowKey(item) : index}
                className={cnTw('table-row', {
                  'table-row--disabled': disabled,
                  'table-row--selected': selected,
                  'cursor-pointer': Boolean(onRowClick) && !disabled,
                })}
                onClick={onRowClick && !disabled ? () => onRowClick(item, index) : undefined}
              >
                {columns.map(column => (
                  <td key={String(column.key)} className={cnTw('table-cell', CELL_ALIGN_STYLES[cellAlign])}>
                    {column.render ? column.render(item[column.key], item) : String(item[column.key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export const Table = memo(TableComponent) as typeof TableComponent;
