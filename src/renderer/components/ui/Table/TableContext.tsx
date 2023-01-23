import { createContext, useContext } from 'react';

import { Alignment, SortConfig, Source, IndexKey } from './common/types';

type TableContextProps = {
  dataSource: Source[];
  sortConfig: SortConfig;
  selectedKeys?: IndexKey[];
  allRowsSelected: boolean;
  addSortingConfig: (dataKey: string, align: Alignment) => void;
  updateSortingOrder: (column: string) => void;
  excludeKey: (key: IndexKey) => void;
  selectAll: () => void;
  selectRow: (key: IndexKey) => void;
};

export const TableContext = createContext<TableContextProps>({} as TableContextProps);

export const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('Table compound components cannot be rendered outside the Table component');
  }

  return context;
};
