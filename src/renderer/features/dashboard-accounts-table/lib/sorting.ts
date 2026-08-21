import { type AccountGroup, type AccountRow, type NumericKey, type SortKey, type TableSortState } from './types';

export const DEFAULT_SORT: TableSortState = { key: 'total', dir: 'desc' };

export const nextSort = (current: TableSortState, key: SortKey): TableSortState => {
  if (current.key === key) return { key, dir: current.dir === 'desc' ? 'asc' : 'desc' };

  return { key, dir: key === 'chain' ? 'asc' : 'desc' };
};

/**
 * Unpriced (`null`) ranks as the lowest value rather than being pinned to one
 * end, so it follows the direction like any other value. Comparing the two
 * sentinels by subtraction would produce `NaN`, which no comparator survives —
 * hence the explicit equality branch.
 */
const compareFiat = (a: number | null, b: number | null): number => {
  const left = a ?? Number.NEGATIVE_INFINITY;
  const right = b ?? Number.NEGATIVE_INFINITY;

  if (left === right) return 0;

  return left < right ? -1 : 1;
};

export const sortRows = (rows: AccountRow[], sort: TableSortState): AccountRow[] => {
  const multiplier = sort.dir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    if (sort.key === 'chain') return multiplier * a.chain.name.localeCompare(b.chain.name);

    return multiplier * compareFiat(a.fiat[sort.key], b.fiat[sort.key]);
  });
};

/**
 * What a group is worth in one column — the fiat sum of its rows there, `null`
 * when the column is unpriced or not applicable on every one of them. `total`
 * is that same sum, already computed once per group as its subtotal.
 */
export const groupColumnFiat = (group: AccountGroup, key: NumericKey): number | null => {
  if (key === 'total') return group.subtotalFiat;

  const priced = group.rows.map((row) => row.fiat[key]).filter((value): value is number => value !== null);

  return priced.length > 0 ? priced.reduce((sum, value) => sum + value, 0) : null;
};

/**
 * Accounts are ranked by **the column being sorted**, not by their total: sort
 * by Governance and every account holding a governance balance rises to the
 * top, with its own rows ordered the same way inside. Without this the sort was
 * trapped inside each group — the numbers moved but the accounts did not, so a
 * person looking for "who has governance locks" still had to scroll all 90 of
 * them.
 *
 * **Chain** is the one exception: it is categorical, so there is nothing to
 * rank an account by — the accounts keep their default order, by fiat subtotal
 * descending.
 */
export const sortGroups = (groups: AccountGroup[], sort: TableSortState): AccountGroup[] => {
  const key: NumericKey = sort.key === 'chain' ? 'total' : sort.key;
  const multiplier = sort.key !== 'chain' && sort.dir === 'asc' ? 1 : -1;

  return [...groups].sort((a, b) => multiplier * compareFiat(groupColumnFiat(a, key), groupColumnFiat(b, key)));
};
