import cn from 'classnames';
import { PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { Alignment, SortConfig, SortType, IndexedValue, IndexKey } from './common/types';
import { getActiveSorting, getSortedData } from './common/utils';
import { TableBody, TableCell, TableColumn, TableHeader, TableRow } from './TableParts';
import { TableContext } from './TableContext';

type Props<T extends IndexedValue> = {
  dataSource: T[];
  className?: string;
  selectedKeys?: IndexKey[];
  onSelect?: (keys: IndexKey[]) => void;
};

// TODO: think about nice TS support
// type TableComposition = {
//   Header: Parameters<typeof TableHeader>;
//   Column: Parameters<typeof TableColumn>;
//   Body: Parameters<typeof TableBody>;
//   Row: Parameters<typeof TableRow>;
//   Cell: Parameters<typeof TableCell>;
// };

const Table = <T extends IndexedValue>({
  dataSource,
  className,
  selectedKeys,
  onSelect,
  children,
}: PropsWithChildren<Props<T>>) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({});
  const [excludedKeys, setExcludedKeys] = useState<IndexKey[]>([]);

  const allRowsSelected = dataSource.length - excludedKeys.length === selectedKeys?.length;

  const addSortingConfig = useCallback(
    (dataKey: string, align: Alignment, sort: boolean) => {
      const payload = {
        dataKey,
        align,
        sort,
        active: false,
        type: SortType.DESC,
      };

      setSortConfig((prev) => ({ ...prev, [dataKey]: payload }));
    },
    [setSortConfig],
  );

  const updateSortingOrder = useCallback(
    (column: string) => {
      if (sortConfig[column]) {
        setSortConfig((prev) => getActiveSorting(column, prev));
      } else {
        console.warn(`${column} is absent`);
      }
    },
    [sortConfig, setSortConfig],
  );

  const excludeKey = useCallback(
    (key: IndexKey) => {
      setExcludedKeys((prev) => prev.concat(key));
    },
    [setExcludedKeys],
  );

  const selectAll = useCallback(() => {
    if (!selectedKeys || !onSelect) return;

    if (allRowsSelected) {
      onSelect?.([]);
    } else {
      const allSelectedKeys = dataSource.reduce<IndexKey[]>((acc, source) => {
        if (!excludedKeys.includes(source.key)) {
          acc.push(source.key);
        }

        return acc;
      }, []);

      onSelect(allSelectedKeys);
    }
  }, [dataSource, excludedKeys, allRowsSelected, onSelect]);

  const selectRow = useCallback(
    (key: IndexKey) => {
      if (!selectedKeys || !onSelect) return;

      if (selectedKeys.includes(key)) {
        onSelect(selectedKeys.filter((k) => k !== key));
      } else {
        onSelect(selectedKeys.concat(key));
      }
    },
    [selectedKeys, onSelect],
  );

  const sortedData = useMemo(() => {
    return getSortedData(dataSource, sortConfig);
  }, [dataSource, sortConfig]);

  const value = {
    dataSource: sortedData,
    sortConfig,
    selectedKeys,
    allRowsSelected,
    addSortingConfig,
    updateSortingOrder,
    excludeKey,
    selectAll,
    selectRow,
  };

  return (
    <TableContext.Provider value={value}>
      <table className={cn('w-full bg-white rounded-2lg table-auto shadow-surface', className)}>{children}</table>
    </TableContext.Provider>
  );
};

Table.Header = TableHeader;
Table.Column = TableColumn;
Table.Body = TableBody;
Table.Cell = TableCell;
Table.Row = TableRow;

export default Table;
