import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, isValidElement, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

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

export type TableVirtualization = {
  /** The scroll container the rows move in — e.g. a `ScrollArea` viewport. */
  getScrollElement: () => HTMLElement | null;
  /** Every row must render at exactly this height, px. */
  rowHeight: number;
  /** Rows kept mounted beyond each edge of the viewport. */
  overscan?: number;
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
   * Keeps every header on a single line: over-long labels clip with an ellipsis
   * (and carry the full text as a `title`) instead of wrapping and pushing the
   * rows down. Meant for dense, fixed-width column layouts; tables whose
   * headers hold multi-line labels or a tooltip trigger should wrap.
   */
  truncateHeaders?: boolean;
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
   * Renders only the rows in (and around) the caller's scroll viewport instead
   * of the whole data set. For long lists mounting hundreds of rows at once
   * blocks the main thread for seconds — a validator table is ~600 rows of
   * identicons and checkboxes. Rows must be fixed-height.
   */
  virtualization?: TableVirtualization;
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
  truncateHeaders = false,
  sort,
  defaultSort,
  onSortChange,
  getRowKey,
  rowProps,
  virtualization,
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
    <div
      className={cnTw(
        'table-container',
        {
          'table-container--sticky-header': stickyHeader,
          'table-container--truncate-header': truncateHeaders,
        },
        className,
      )}
    >
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
                    {isValidElement(column.title) ? (
                      column.title
                    ) : (
                      <span title={truncateHeaders && typeof column.title === 'string' ? column.title : undefined}>
                        {column.title}
                      </span>
                    )}
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
        {virtualization ? (
          <VirtualizedTableBody
            data={sortedData}
            columns={columns}
            cellAlign={cellAlign}
            virtualization={virtualization}
            getRowKey={getRowKey}
            rowProps={rowProps}
            onRowClick={onRowClick}
          />
        ) : (
          <tbody className="table-body">
            {sortedData.map((item, index) => (
              <TableRow
                key={getRowKey ? getRowKey(item) : index}
                item={item}
                index={index}
                columns={columns}
                cellAlign={cellAlign}
                rowProps={rowProps}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        )}
      </table>
    </div>
  );
};

type TableRowComponentProps<T> = {
  item: T;
  index: number;
  columns: Column<T>[];
  cellAlign: CellAlign;
  rowProps?: (item: T) => TableRowProps;
  onRowClick?: (item: T, index: number) => void;
};

const TableRow = <T,>({ item, index, columns, cellAlign, rowProps, onRowClick }: TableRowComponentProps<T>) => {
  const { disabled = false, selected = false } = rowProps?.(item) ?? {};

  return (
    <tr
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
};

type VirtualizedTableBodyProps<T> = Pick<
  TableRowComponentProps<T>,
  'columns' | 'cellAlign' | 'rowProps' | 'onRowClick'
> & {
  data: T[];
  virtualization: TableVirtualization;
  getRowKey?: (item: T) => string;
};

/**
 * Spacer-row virtualization: two empty `<tr>`s carry the height of everything
 * off-screen, so the table keeps its natural flow (and `table-layout: fixed`
 * keeps the columns aligned with the header no matter which rows are mounted).
 */
const VirtualizedTableBody = <T,>({
  data,
  columns,
  cellAlign,
  virtualization,
  getRowKey,
  rowProps,
  onRowClick,
}: VirtualizedTableBodyProps<T>) => {
  const rowCount = data.length;
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // The scroll element is an *ancestor* of this table, and React attaches an
  // ancestor's ref after a descendant's layout effect has already run — so in
  // a layout effect on first mount `getScrollElement()` answers `null`, and if
  // nothing re-renders the table afterwards (the data was already there when
  // it mounted) it stays `null` and the virtualizer renders no rows at all.
  // A passive effect runs once the whole commit is done, refs included, so
  // resolving here (a ref read, nothing measured) is what lets the measuring
  // effect below start as soon as the element exists.
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const next = virtualization.getScrollElement();
    setScrollElement(prev => (prev === next ? prev : next));
  });

  // Row positions are relative to the scroll viewport, but the header (and
  // anything the caller renders above the table) pushes the body down — measure
  // that offset, same way `features/multisig-operations` does for its list.
  //
  // Deliberately *not* measured on every render: the virtualizer re-renders on
  // every scroll frame, and a `getBoundingClientRect` there forces a synchronous
  // layout on each of them. The offset only moves when the viewport or the
  // content above the body is resized, which is what the observer watches for.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !scrollElement) return;

    const measure = () => {
      const margin = Math.round(
        body.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop,
      );
      setScrollMargin(prev => (prev === margin ? prev : margin));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(scrollElement);
    // The table itself: a header that rewraps, or a caller's block above it
    // growing, both move the body without resizing the viewport.
    const table = body.closest('table');
    if (table) observer.observe(table);

    return () => observer.disconnect();
  }, [scrollElement, rowCount]);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: virtualization.getScrollElement,
    estimateSize: () => virtualization.rowHeight,
    overscan: virtualization.overscan ?? 10,
    scrollMargin,
    getItemKey: index => {
      const item = data[index];

      return item !== undefined && getRowKey ? getRowKey(item) : index;
    },
  });

  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems.at(0);
  const lastItem = virtualItems.at(-1);
  // `start`/`end` include the scroll margin, `getTotalSize` does not.
  const topPad = firstItem ? firstItem.start - scrollMargin : 0;
  const bottomPad = lastItem ? virtualizer.getTotalSize() - (lastItem.end - scrollMargin) : 0;

  return (
    <tbody ref={bodyRef} className="table-body">
      {topPad > 0 && (
        <tr aria-hidden>
          <td colSpan={columns.length} style={{ height: topPad, padding: 0 }} />
        </tr>
      )}
      {virtualItems.map(virtualItem => {
        const item = data[virtualItem.index];
        if (item === undefined) return null;

        return (
          <TableRow
            key={virtualItem.key}
            item={item}
            index={virtualItem.index}
            columns={columns}
            cellAlign={cellAlign}
            rowProps={rowProps}
            onRowClick={onRowClick}
          />
        );
      })}
      {bottomPad > 0 && (
        <tr aria-hidden>
          <td colSpan={columns.length} style={{ height: bottomPad, padding: 0 }} />
        </tr>
      )}
    </tbody>
  );
};

export const Table = memo(TableComponent) as typeof TableComponent;
