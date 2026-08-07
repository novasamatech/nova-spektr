import { type ReactNode, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { type CsvColumn, buildCsv, downloadCsv } from '@/shared/lib/csv';
import { cnTw } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText } from '@/shared/ui';
import { SearchInput } from '../SearchInput/SearchInput';
import { type TableRowProps, type TableSort } from '../Table';
import '../Table/Table.css';

import { DataTableFilterPopover } from './DataTableFilterPopover';
import { countActiveFilters, emptyFilterState, filterRows, isColumnFiltered, searchRows, sortRows } from './filtering';
import { type DataTableColumn, type DataTableFilterState } from './types';

/**
 * Past this many rows the card would grow taller than the dashboard grid, so
 * the body becomes the scroll container instead of the page.
 */
const DEFAULT_SCROLL_THRESHOLD = 20;
/** Eight rows plus the header. */
const DEFAULT_SCROLL_MAX_HEIGHT = 448;

/**
 * Keeps the sticky header working: `.table-container` is `overflow: hidden`,
 * which would make it the sticky ancestor and pin the header to a box that
 * never scrolls. Handing the scroll to the wrapper and letting the header cells
 * stick is what actually holds the columns in place.
 */
const SCROLL_CLASS = [
  'overflow-y-auto',
  '[&_.table-container]:overflow-visible',
  '[&_.table-header-cell]:sticky',
  '[&_.table-header-cell]:top-0',
  '[&_.table-header-cell]:z-1',
  '[&_.table-header-cell]:bg-white',
].join(' ');

type Props<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  defaultSort?: TableSort | null;
  rowProps?: (row: T) => TableRowProps;
  onRowClick?: (row: T) => void;
  /** Shows the search box when provided. */
  searchPlaceholder?: string;
  scrollThreshold?: number;
  scrollMaxHeight?: number;
  /**
   * Enables the export button. Receives the filters that produced the file, so
   * the name can carry them — a folder of exports is unreadable when three of
   * them differ only by a filter nobody wrote down.
   */
  exportFileName?: (context: { query: string; filters: DataTableFilterState }) => string;
  emptyMessage?: ReactNode;
  /** Extra controls rendered at the left of the toolbar. */
  toolbar?: ReactNode;
  className?: string;
};

/**
 * A dashboard table that owns its own sort, per-column filters, search and CSV
 * export.
 *
 * Every one of those runs over the **display strings the columns render**, not
 * over the underlying record: a query typed from what is on screen has to match
 * what is on screen, and a filter that offers an option the table cannot show
 * is a bug in both directions.
 */
export const DataTable = <T,>({
  columns,
  rows,
  getRowId,
  defaultSort = null,
  rowProps,
  onRowClick,
  searchPlaceholder,
  scrollThreshold = DEFAULT_SCROLL_THRESHOLD,
  scrollMaxHeight = DEFAULT_SCROLL_MAX_HEIGHT,
  exportFileName,
  emptyMessage,
  toolbar,
  className,
}: Props<T>) => {
  const { t } = useI18n();

  const [sort, setSort] = useState<TableSort | null>(defaultSort);
  const [filters, setFilters] = useState<DataTableFilterState>(emptyFilterState);
  const [query, setQuery] = useState('');

  const visibleRows = useMemo(() => {
    const filtered = filterRows(rows, columns, filters);
    const searched = searchRows(filtered, columns, query);

    return sortRows(searched, columns, sort);
  }, [rows, columns, filters, query, sort]);

  const activeFilters = countActiveFilters(filters);
  const narrowed = activeFilters > 0 || query.trim() !== '';

  const handleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;

    setSort(prev => {
      if (prev?.column !== column.id) return { column: column.id, direction: 'asc' };
      if (prev.direction === 'asc') return { column: column.id, direction: 'desc' };

      // Third click clears the sort and returns to the caller's default order.
      return defaultSort;
    });
  };

  const handleExport = () => {
    if (!exportFileName) return;

    const csvColumns: CsvColumn<T>[] = columns
      .filter(column => !column.decorative && (column.exportValue || column.text))
      .map(column => ({
        header: typeof column.title === 'string' ? column.title : column.id,
        cell: (row: T) => column.exportValue?.(row) ?? column.text?.(row) ?? '',
      }));

    downloadCsv(exportFileName({ query, filters }), buildCsv(csvColumns, visibleRows));
  };

  const scrolls = visibleRows.length > scrollThreshold;

  const hasToolbar = Boolean(searchPlaceholder || toolbar || exportFileName || narrowed);

  return (
    <div className={cnTw('flex flex-col gap-y-3', className)}>
      {hasToolbar && (
        <div className="flex items-center gap-x-2">
          {toolbar}

          {searchPlaceholder && (
            <div className="w-56">
              <SearchInput value={query} placeholder={searchPlaceholder} onChange={setQuery} />
            </div>
          )}

          <div className="ml-auto flex items-center gap-x-2">
            {narrowed && (
              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  setFilters(emptyFilterState());
                  setQuery('');
                }}
              >
                {t('dataTable.clearFilters')}
              </Button>
            )}

            {exportFileName && (
              <Button variant="text" size="sm" disabled={visibleRows.length === 0} onClick={handleExport}>
                {t('dataTable.export')}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={scrolls ? SCROLL_CLASS : undefined} style={scrolls ? { maxHeight: scrollMaxHeight } : undefined}>
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                {columns.map(column => {
                  const isActive = sort?.column === column.id;

                  return (
                    <th
                      key={column.id}
                      className={cnTw('table-header-cell', {
                        'table-header-cell--sortable': column.sortable,
                        'table-header-cell--active': isActive,
                      })}
                      style={{ width: column.width }}
                      onClick={() => handleSort(column)}
                    >
                      <div className="table-header-content">
                        <span className="truncate">{column.title}</span>

                        <div className="flex shrink-0 items-center gap-x-1">
                          {column.sortable && (
                            <div className="table-sort-indicator">
                              {/* eslint-disable-next-line i18next/no-literal-string */}
                              {isActive && sort.direction === 'asc' && <span className="text-xs">▴</span>}
                              {/* eslint-disable-next-line i18next/no-literal-string */}
                              {isActive && sort.direction === 'desc' && <span className="text-xs">▾</span>}
                              {/* eslint-disable-next-line i18next/no-literal-string */}
                              {!isActive && <span className="text-xs opacity-30">⇅</span>}
                            </div>
                          )}

                          {column.filter && (
                            <DataTableFilterPopover
                              column={column}
                              rows={rows}
                              filters={filters}
                              active={isColumnFiltered(filters, column)}
                              onFiltersChange={setFilters}
                            />
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="table-body">
              {visibleRows.map(row => {
                const { disabled = false, selected = false } = rowProps?.(row) ?? {};

                return (
                  <tr
                    key={getRowId(row)}
                    className={cnTw('table-row', {
                      'table-row--disabled': disabled,
                      'table-row--selected': selected,
                      'cursor-pointer': Boolean(onRowClick) && !disabled,
                    })}
                    onClick={onRowClick && !disabled ? () => onRowClick(row) : undefined}
                  >
                    {columns.map(column => (
                      <td key={column.id} className="table-cell align-middle">
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {visibleRows.length === 0 && (
        <div className="flex justify-center py-6">
          <FootnoteText className="text-text-tertiary">
            {narrowed ? t('dataTable.noMatches') : emptyMessage}
          </FootnoteText>
        </div>
      )}

      {visibleRows.length > 0 && (scrolls || narrowed) && (
        <CaptionText className="text-text-tertiary">
          {t('dataTable.rowCount', { visible: visibleRows.length, total: rows.length })}
        </CaptionText>
      )}
    </div>
  );
};
