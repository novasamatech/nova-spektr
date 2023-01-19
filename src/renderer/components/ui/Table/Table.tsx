import { orderBy } from 'lodash';
import { PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { SortConfig, SortType, Source } from './common/types';
import { TableBody, TableCell, TableColumn, TableHeader, TableRow } from './TableComponents';
import { TableContext } from './TableContext';

type Props = {
  dataSource: Source[];
};

const getSortedData = (dataSource: Source[], sorting: SortConfig): Source[] => {
  const sortField = Object.values(sorting).find((sort) => sort.type !== SortType.NONE);

  if (!dataSource.length || !sortField || sortField.type === SortType.NONE) {
    return dataSource;
  }

  return orderBy(dataSource, [sortField.dataKey], [sortField.type]);
};

const getActiveSorting = (column: string, config: SortConfig): SortConfig => {
  return Object.entries(config).reduce<SortConfig>((acc, [key, value]) => {
    const payload = { ...value, type: SortType.NONE };

    if (key === column) {
      payload.type = value.type === SortType.DESC ? SortType.ASC : SortType.DESC;
    }

    return { ...acc, [key]: payload };
  }, {});
};

const Table = ({ dataSource, children }: PropsWithChildren<Props>) => {
  const [sorting, setSorting] = useState<SortConfig>({});

  const addNewSorting = useCallback(
    (dataKey: string) => {
      const payload = { dataKey, type: SortType.NONE };

      setSorting((prev) => ({ ...prev, [dataKey]: payload }));
    },
    [setSorting],
  );

  const updateSorting = useCallback(
    (column: string) => {
      if (!sorting || !sorting[column]) {
        console.warn(`${column} is absent`);

        return;
      }

      setSorting((prev) => getActiveSorting(column, prev));
    },
    [sorting, setSorting],
  );

  const value = useMemo(() => {
    const sortedData = getSortedData(dataSource, sorting);

    return { dataSource: sortedData, sorting, addNewSorting, updateSorting };
  }, [dataSource, sorting, addNewSorting, updateSorting]);

  return (
    <TableContext.Provider value={value}>
      <table>{children}</table>
    </TableContext.Provider>
  );
};

Table.Header = TableHeader;
Table.Column = TableColumn;
Table.Body = TableBody;
Table.Cell = TableCell;
Table.Row = TableRow;

export default Table;
