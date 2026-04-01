import { type ReactNode, isValidElement, memo, useMemo, useState } from 'react';

import { cnTw } from '@/shared/lib/utils';

import './Table.css';

export type SortDirection = 'asc' | 'desc' | null;

export type Column<T> = {
  key: keyof T;
  title: ReactNode;
  sortable?: boolean;
  width?: string;
  render?: (value: T[keyof T], item: T) => ReactNode;
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
  rowTestId?: string;
  onSort?: (key: keyof T, direction: SortDirection) => void;
  onRowClick?: (item: T, index: number) => void;
};

const TableComponent = <T,>({ columns, data, className, cellAlign = 'middle', rowTestIdб onSort, onRowClick }: TableProps<T>) => {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: keyof T) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortKey === key && sortDirection === 'asc') {
      newDirection = 'desc';
    } else if (sortKey === key && sortDirection === 'desc') {
      newDirection = null;
      setSortKey(null);
    } else {
      setSortKey(key);
    }

    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

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

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  return (
    <div className={cnTw('table-container', className)}>
      <table className="table">
        <thead className="table-header">
          <tr>
            {columns.map(column => (
              <th
                key={String(column.key)}
                className={cnTw('table-header-cell', {
                  'table-header-cell--sortable': column.sortable,
                  'table-header-cell--active': sortKey === column.key && sortDirection,
                })}
                style={{ width: column.width }}
                onClick={() => handleSort(column.key)}
              >
                <div className="table-header-content">
                  {isValidElement(column.title) ? column.title : <span>{column.title}</span>}
                  {column.sortable && (
                    <div className="table-sort-indicator">
                      {sortKey === column.key && sortDirection === 'asc' && <span className="text-xs">↑</span>}
                      {sortKey === column.key && sortDirection === 'desc' && <span className="text-xs">↓</span>}
                      {sortKey !== column.key && <span className="text-xs opacity-30">↑</span>}
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {sortedData.map((item, index) => (
            <tr
              key={index}
              className={cnTw('table-row', onRowClick && 'cursor-pointer')}
              data-testid={rowTestId}
              onClick={onRowClick ? () => onRowClick(item, index) : undefined}
            >
              {columns.map(column => (
                <td key={String(column.key)} className={cnTw('table-cell', CELL_ALIGN_STYLES[cellAlign])}>
                  {column.render ? column.render(item[column.key], item) : String(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Table = memo(TableComponent) as typeof TableComponent;
