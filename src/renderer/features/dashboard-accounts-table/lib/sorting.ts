import { type AccountGroup, type AccountRow, type SortKey, type TableSortState } from './types';

export const DEFAULT_SORT: TableSortState = { key: 'total', dir: 'desc' };

export const nextSort = (current: TableSortState, key: SortKey): TableSortState => {
  if (current.key === key) return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' };

  return { key, dir: key === 'chain' ? 'asc' : 'desc' };
};

export const sortRows = (rows: AccountRow[], sort: TableSortState): AccountRow[] => {
  const mul = sort.dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sort.key === 'chain') return mul * a.chain.name.localeCompare(b.chain.name);

    return mul * ((a.fiat[sort.key] ?? Number.NEGATIVE_INFINITY) - (b.fiat[sort.key] ?? Number.NEGATIVE_INFINITY));
  });
};

export type GroupOrder = 'value' | 'name';

export const sortGroups = (groups: AccountGroup[], order: GroupOrder): AccountGroup[] => {
  if (order === 'name') return [...groups].sort((a, b) => a.name.localeCompare(b.name));

  return [...groups].sort(
    (a, b) => (b.subtotalFiat ?? Number.NEGATIVE_INFINITY) - (a.subtotalFiat ?? Number.NEGATIVE_INFINITY),
  );
};
