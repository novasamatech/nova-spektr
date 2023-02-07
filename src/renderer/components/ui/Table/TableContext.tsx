import { Context, createContext, useContext } from 'react';

import { AnyRecord, ColumnConfig, IndexKey, SortConfig } from './common/types';

type TableContextProps<T extends AnyRecord> = {
  by: IndexKey;
  dataSource: T[];
  loading?: boolean;
  sortConfig: SortConfig;
  selectedKeys?: IndexKey[];
  allRowsSelected: boolean;
  addSortingConfig: (params: ColumnConfig) => void;
  updateSortingOrder: (column: string) => void;
  excludeKey: (key: IndexKey) => void;
  selectAll: () => void;
  selectRow: (key: IndexKey) => void;
};

export const TableContext = createContext<TableContextProps<AnyRecord>>({} as TableContextProps<AnyRecord>);

export const useTableContext = <T extends AnyRecord>() => {
  const context = useContext<TableContextProps<T>>(TableContext as unknown as Context<TableContextProps<T>>);
  if (!context) {
    throw new Error('Table compound components cannot be rendered outside the Table component');
  }

  return context;
};
