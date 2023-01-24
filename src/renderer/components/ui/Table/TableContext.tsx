import { Context, createContext, useContext } from 'react';

import { Alignment, IndexKey, SortConfig, IndexedValue } from './common/types';

type TableContextProps<T extends IndexedValue> = {
  dataSource: T[];
  sortConfig: SortConfig;
  selectedKeys?: IndexKey[];
  allRowsSelected: boolean;
  addSortingConfig: (dataKey: string, align: Alignment, sort: boolean) => void;
  updateSortingOrder: (column: string) => void;
  excludeKey: (key: IndexKey) => void;
  selectAll: () => void;
  selectRow: (key: IndexKey) => void;
};

export const TableContext = createContext<TableContextProps<IndexedValue>>({} as TableContextProps<IndexedValue>);

export const useTableContext = <T extends IndexedValue>() => {
  const context = useContext<TableContextProps<T>>(TableContext as unknown as Context<TableContextProps<T>>);
  if (!context) {
    throw new Error('Table compound components cannot be rendered outside the Table component');
  }

  return context;
};
