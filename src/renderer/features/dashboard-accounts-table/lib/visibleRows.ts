import { performSearch } from '@/shared/lib/utils';

import { type TableFilters, applyFilters } from './filters';
import { groupRows } from './rows';
import { sortGroups, sortRows } from './sorting';
import { type AccountGroup, type AccountRow, type TableSortState } from './types';

type Input = {
  rows: AccountRow[];
  search: string;
  filters: TableFilters;
  sort: TableSortState;
};

/**
 * Search matches the strings the row actually shows — resolved account name,
 * the displayed SS58 address, the chain name — never the raw `accountId` or an
 * unresolved field (search-patterns rule). `performSearch` re-ranks by match
 * weight, so its result only decides _which_ rows match: the grouped table's
 * order carries meaning, so the source order is kept.
 */
const searchRows = (rows: AccountRow[], search: string): AccountRow[] => {
  if (search.trim().length === 0) return rows;

  const matched = performSearch({
    records: rows,
    query: search,
    weights: { displayName: 1, displayAddress: 0.5, chainName: 0.5 },
    getMeta: (row) => ({ chainName: row.chain.name }),
  });
  const kept = new Set(matched.map((row) => row.id));

  return rows.filter((row) => kept.has(row.id));
};

/**
 * Everything between "the balances of the selected accounts" and "what is on
 * screen": search, filters, row sort, grouping, account sort — in that order.
 *
 * It lives here rather than inline in the hook because the CSV export is
 * defined as "exactly what the table is showing". One function means the export
 * cannot drift from the view — a filter that reaches the screen reaches the
 * file, with no second implementation to keep in step (`visibleRows.test.ts`
 * pins that).
 *
 * Fold state is deliberately absent: collapsing an account hides its rows, it
 * does not filter them, so a folded card still exports.
 */
export const buildVisibleGroups = ({ rows, search, filters, sort }: Input): AccountGroup[] => {
  const searched = searchRows(rows, search);
  const filtered = applyFilters(searched, filters);
  const sorted = sortRows(filtered, sort);

  // `sort` reaches the group ordering too: the sorted column ranks the accounts
  // themselves, not just the rows inside each one.
  return sortGroups(groupRows(sorted), sort);
};

/** The row sequence a person sees top to bottom — the CSV's row order. */
export const collectVisibleRows = (groups: AccountGroup[]): AccountRow[] => groups.flatMap((group) => group.rows);
