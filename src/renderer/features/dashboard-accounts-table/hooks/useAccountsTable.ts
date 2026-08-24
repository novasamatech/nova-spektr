import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { buildCsv, downloadCsv } from '@/shared/lib/csv';
import { formatFiatBalance } from '@/shared/lib/utils';
import { type CurrencyItem } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';
import { accountsCsvColumns, accountsCsvFileName, buildExportFilterParts } from '../lib/csv';
import {
  type ChipLabels,
  type FilterChip,
  type ListField,
  type TableFilters,
  EMPTY_FILTERS,
  buildFilterChips,
  countActiveFilters,
} from '../lib/filters';
import { DEFAULT_SORT, nextSort } from '../lib/sorting';
import { type AccountGroup, type AccountRow, type SortKey, type TableSortState } from '../lib/types';
import { buildVisibleGroups, collectVisibleRows } from '../lib/visibleRows';

import { useAccountRows } from './useAccountRows';
import { useStakingAccountSelection } from './useStakingAccountSelection';

/**
 * Fiat amount with the active currency symbol/code, matching
 * `dashboard-portfolio-overview/lib/formatFiat` — one helper for the
 * grand-total chip and every group subtotal. `null` (nothing priced) renders as
 * an em dash.
 */
const formatFiat = (value: number | null, currency: CurrencyItem | null): string => {
  if (value === null) return '—';

  const { formatted } = formatFiatBalance(value.toString());

  return currency?.symbol ? `${currency.symbol}${formatted}` : `${formatted} ${currency?.code ?? ''}`.trim();
};

export type AccountsTableState = {
  /** Rows the selection produced, before search and filters. */
  rows: AccountRow[];
  /**
   * The rows a person sees, top to bottom — what the footer counts and what the
   * CSV exports, in that very order. Empty when search/filters match nothing.
   */
  visibleRows: AccountRow[];
  /**
   * What the table renders: accounts and their rows both ranked by the sorted
   * column.
   */
  groups: AccountGroup[];
  ready: boolean;
  hasSelection: boolean;
  fiatVisible: boolean;
  activeCurrency: CurrencyItem | null;
  formatSubtotal: (value: number | null) => string;

  filters: TableFilters;
  setFilters: (filters: TableFilters) => void;
  activeFilterCount: number;
  chips: FilterChip[];
  clearAll: () => void;

  search: string;
  setSearch: (search: string) => void;

  sort: TableSortState;
  applySort: (key: SortKey) => void;

  isGroupOpen: (key: string) => boolean;
  toggleGroup: (key: string) => void;
  allOpen: boolean;
  toggleAllGroups: () => void;

  exportCsv: () => void;
};

type Params = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

/**
 * Everything the table is, minus its chrome: the rows, the filter/search/sort
 * state and the CSV export. One instance drives both the dashboard widget and
 * the full-screen view, so opening the full screen carries the current filters,
 * sort and fold state over instead of resetting them.
 */
export const useAccountsTable = ({ accountIds, allEntries }: Params): AccountsTableState => {
  const { t } = useI18n();

  const fiatVisible = useUnit(currencySelect.$fiatFlag);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);

  const [filters, setFilters] = useState<TableFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT);
  const [search, setSearch] = useState('');
  const [closedGroups, setClosedGroups] = useState<ReadonlySet<string>>(new Set());

  useStakingAccountSelection(accountIds);
  const { rows, ready } = useAccountRows(accountIds, allEntries);

  const groups = useMemo(() => buildVisibleGroups({ rows, search, filters, sort }), [rows, search, filters, sort]);

  const formatSubtotal = useCallback((value: number | null) => formatFiat(value, activeCurrency), [activeCurrency]);

  // Chip values must show what the table shows: chain/account filters store ids
  // (chainId / groupKey hex), so both resolve through the rows' displayed names.
  const chainNameById = useMemo(
    () => new Map<string, string>(rows.map((row) => [row.chain.chainId, row.chain.name])),
    [rows],
  );
  const accountNameByKey = useMemo(() => new Map(rows.map((row) => [row.groupKey, row.displayName])), [rows]);

  const chips = useMemo(() => {
    const fieldLabels: Record<ListField, string> = {
      networks: t('dashboard.accountsTable.filters.network'),
      chains: t('dashboard.accountsTable.filters.chain'),
      accounts: t('dashboard.accountsTable.filters.account'),
      assets: t('dashboard.accountsTable.filters.asset'),
    };

    const labels: ChipLabels = {
      field: (field) => fieldLabels[field],
      value: (field, value) => {
        switch (field) {
          case 'chains':
            return chainNameById.get(value) ?? value;
          case 'accounts':
            return accountNameByKey.get(value) ?? value;
          case 'minTotalFiat':
            return t('dashboard.accountsTable.filters.amountMin', { value });
          default:
            return value;
        }
      },
    };

    return buildFilterChips(filters, labels);
  }, [filters, t, chainNameById, accountNameByKey]);

  const clearAll = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  }, []);

  // Functional update keeps this stable across renders (no `closedGroups` dep),
  // so it can be passed directly to `GroupSection` without defeating its memo.
  const toggleGroup = useCallback((key: string) => {
    setClosedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }, []);

  const allOpen = closedGroups.size === 0;

  // The row sequence a person actually sees: the on-screen account order, then
  // each account's own rows — not the flat `sorted` list, which ranks rows
  // globally and ignores which account they belong to.
  // Collapsed groups are still included: collapse is a display concern, not a
  // data filter, so folding a card must not silently drop its rows from the
  // export. Single source of truth for both the button's enabled state and
  // the exported rows, so they can never disagree.
  const visibleRows = useMemo(() => collectVisibleRows(groups), [groups]);

  const exportCsv = () => {
    const columns = accountsCsvColumns({
      network: t('dashboard.accountsTable.columns.network'),
      chain: t('dashboard.accountsTable.columns.chain'),
      account: t('dashboard.accountsTable.columns.account'),
      address: t('dashboard.accountsTable.columns.address'),
      asset: t('dashboard.accountsTable.columns.asset'),
      transferable: t('dashboard.accountsTable.columns.transferable'),
      staked: t('dashboard.accountsTable.columns.staked'),
      governance: t('dashboard.accountsTable.columns.governance'),
      other: t('dashboard.accountsTable.columns.other'),
      total: t('dashboard.accountsTable.columns.total'),
    });
    const filename = accountsCsvFileName(buildExportFilterParts(filters, search));

    downloadCsv(filename, buildCsv(columns, visibleRows));
  };

  return {
    rows,
    visibleRows,
    groups,
    ready,
    hasSelection: accountIds.length > 0,
    fiatVisible,
    activeCurrency,
    formatSubtotal,

    filters,
    setFilters,
    activeFilterCount: countActiveFilters(filters),
    chips,
    clearAll,

    search,
    setSearch,

    sort,
    applySort: (key) => setSort((current) => nextSort(current, key)),

    isGroupOpen: (key) => !closedGroups.has(key),
    toggleGroup,
    allOpen,
    toggleAllGroups: () => setClosedGroups(allOpen ? new Set(groups.map((group) => group.key)) : new Set()),

    exportCsv,
  };
};
