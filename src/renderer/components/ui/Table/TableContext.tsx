import { createContext, useContext } from 'react';

import { SortConfig, Source } from './common/types';

type TableContextProps = {
  dataSource: Source[];
  sorting: SortConfig;
  addNewSorting: (column: string) => void;
  updateSorting: (column: string) => void;
};

export const TableContext = createContext<TableContextProps>({} as TableContextProps);

export const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('Table compound components cannot be rendered outside the Table component');
  }

  return context;
};
