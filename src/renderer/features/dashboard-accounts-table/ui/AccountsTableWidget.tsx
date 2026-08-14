import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatFiatBalance, performSearch } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { SearchInput } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { currencySelect } from '@/aggregates/currency-select';
import { DashboardWidget } from '@/pages/Dashboard';
import { useAccountRows } from '../hooks/useAccountRows';
import { useTrackedContacts } from '../hooks/useTrackedContacts';
import {
  type ChipLabels,
  type ListField,
  type TableFilters,
  EMPTY_FILTERS,
  applyFilters,
  buildFilterChips,
  countActiveFilters,
} from '../lib/filters';
import { groupRows } from '../lib/rows';
import { type GroupOrder, DEFAULT_SORT, nextSort, sortGroups, sortRows } from '../lib/sorting';
import { type TableSortState } from '../lib/types';

import { EmptyFiltered, NoBalances, NoSelection } from './EmptyStates';
import { FilterBar } from './FilterBar';
import { FilterChips } from './FilterChips';
import { GroupSection } from './GroupSection';
import { TableHeaderRow } from './TableHeaderRow';
import { TableSkeleton } from './TableSkeleton';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

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

// Same chrome as FilterBar's dropdown triggers, so the header's group-order
// toggle reads as part of the same control family.
const ORDER_TOGGLE_CLASS = cnTw(
  'flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-filter-border px-2.5',
  'text-footnote text-text-secondary hover:bg-block-background',
);

export const AccountsTableWidget = ({ accountIds, allEntries }: Props) => {
  const { t } = useI18n();

  const fiatVisible = useUnit(currencySelect.$fiatFlag);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);

  const [filters, setFilters] = useState<TableFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<TableSortState>(DEFAULT_SORT);
  const [search, setSearch] = useState('');
  const [groupOrder, setGroupOrder] = useState<GroupOrder>('value');
  const [closedGroups, setClosedGroups] = useState<ReadonlySet<string>>(new Set());

  useTrackedContacts(accountIds);
  const { rows, ready } = useAccountRows(accountIds, allEntries);

  const searched = useMemo(() => {
    if (search.trim().length === 0) return rows;

    const matched = performSearch({
      records: rows,
      query: search,
      weights: { displayName: 1, displayAddress: 0.5, chainName: 0.5 },
      getMeta: (row) => ({ chainName: row.chain.name }),
    });
    const kept = new Set(matched.map((row) => row.id));

    // keep source order — performSearch re-ranks, and the grouped table's order
    // carries meaning (search-patterns rule)
    return rows.filter((row) => kept.has(row.id));
  }, [rows, search]);

  const filtered = useMemo(() => applyFilters(searched, filters), [searched, filters]);
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort]);
  const groups = useMemo(() => sortGroups(groupRows(sorted), groupOrder), [sorted, groupOrder]);

  const grandTotal = useMemo(() => {
    const priced = groups.map((group) => group.subtotalFiat).filter((value): value is number => value !== null);

    return priced.length > 0 ? priced.reduce((sum, value) => sum + value, 0) : null;
  }, [groups]);

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
      walletTypes: t('dashboard.accountsTable.filters.walletType'),
    };

    const labels: ChipLabels = {
      field: (field) => fieldLabels[field],
      value: (field, value) => {
        switch (field) {
          case 'chains':
            return chainNameById.get(value) ?? value;
          case 'accounts':
            return accountNameByKey.get(value) ?? value;
          case 'walletTypes':
            return t(`dashboard.accountsTable.walletTypes.${value}`);
          case 'minTotalFiat':
            return t('dashboard.accountsTable.filters.amountMin', { value });
          default:
            return value;
        }
      },
    };

    return buildFilterChips(filters, labels);
  }, [filters, t, chainNameById, accountNameByKey]);

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

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
  const toggleAllGroups = () => {
    setClosedGroups(allOpen ? new Set(groups.map((group) => group.key)) : new Set());
  };

  // Must be invoked as `{renderBody()}` below, never rendered as `<RenderBody />` —
  // as a component it would remount on every parent render instead of just
  // returning fresh JSX.
  const renderBody = () => {
    if (accountIds.length === 0) return <NoSelection />;
    if (!ready) return <TableSkeleton />;
    if (filtered.length === 0 && (countActiveFilters(filters) > 0 || search.trim().length > 0)) {
      return <EmptyFiltered onClearFilters={clearAll} />;
    }
    if (rows.length === 0) {
      return <NoBalances />;
    }

    return (
      <>
        <TableHeaderRow sort={sort} onSort={(key) => setSort(nextSort(sort, key))} />
        {groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            open={!closedGroups.has(group.key)}
            fiatVisible={fiatVisible}
            formatSubtotal={formatSubtotal}
            onToggle={toggleGroup}
          />
        ))}
      </>
    );
  };

  return (
    // `card={false}` + our own chrome (same classes as DashboardWidget's CARD_CLASS,
    // but no padding): the header's `border-b` needs to reach the card edges, and
    // the row dividers must be full-bleed too — see KpiWidgetFrame for the same
    // precedent. DashboardWidget still wraps `children` in its own
    // `min-h-0 flex-1 overflow-y-auto` div regardless of `card`, and only the rows
    // region below should scroll — the header/filter bar must stay fixed. So this
    // chrome div is `h-full overflow-hidden`: it exactly fills DashboardWidget's
    // wrapper and never scrolls itself, leaving the rows region's own
    // `overflow-y-auto` (below) as the single active scroller.
    <DashboardWidget card={false}>
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-token-container-border bg-white shadow-card-shadow">
        <div className="flex items-center gap-3 border-b border-divider px-4 py-3.5">
          <SmallTitleText className="shrink-0">{t('dashboard.accountsTable.title')}</SmallTitleText>

          <FootnoteText className="shrink-0 rounded-full bg-block-background px-2.5 py-1 text-text-secondary">
            {t('dashboard.accountsTable.rowCount', { count: filtered.length })}
          </FootnoteText>

          {fiatVisible && grandTotal !== null ? (
            <FootnoteText className="shrink-0 rounded-full bg-badge-background px-2.5 py-1 font-semibold text-tab-text-accent tabular-nums">
              {formatSubtotal(grandTotal)}
            </FootnoteText>
          ) : null}

          <div className="flex-1" />

          <button
            type="button"
            className={ORDER_TOGGLE_CLASS}
            onClick={() => setGroupOrder((order) => (order === 'value' ? 'name' : 'value'))}
          >
            <span className="truncate">
              {t(
                groupOrder === 'value'
                  ? 'dashboard.accountsTable.groupOrderValue'
                  : 'dashboard.accountsTable.groupOrderName',
              )}
            </span>
            <Icon name="down" size={12} className="shrink-0 text-inherit" />
          </button>

          <Button variant="text" size="sm" onClick={toggleAllGroups}>
            {t(allOpen ? 'dashboard.accountsTable.collapseAll' : 'dashboard.accountsTable.expandAll')}
          </Button>

          <div className="w-48 shrink-0">
            <SearchInput
              height="sm"
              value={search}
              placeholder={t('dashboard.accountsTable.searchPlaceholder')}
              onChange={setSearch}
            />
          </div>

          {/* Task 10 wires export */}
          <span title={t('dashboard.accountsTable.exportCsvDisabled')}>
            <Button variant="fill" pallet="secondary" size="sm" disabled>
              {t('dashboard.accountsTable.exportCsv')}
            </Button>
          </span>
        </div>

        <FilterBar rows={rows} filters={filters} currencyCode={activeCurrency?.code ?? 'USD'} onChange={setFilters} />

        <FilterChips chips={chips} onChange={setFilters} onClearAll={clearAll} />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{renderBody()}</div>

        {ready && accountIds.length > 0 ? (
          <div className="flex h-10 shrink-0 items-center gap-3 border-t border-divider px-4">
            <FootnoteText className="shrink-0 text-text-secondary">
              {t('dashboard.accountsTable.footer.showing', {
                rows: filtered.length,
                total: rows.length,
                accounts: groups.length,
              })}
            </FootnoteText>

            <div className="flex-1" />

            <FootnoteText className="truncate text-text-tertiary">
              {t('dashboard.accountsTable.footer.note')}
            </FootnoteText>
          </div>
        ) : null}
      </div>
    </DashboardWidget>
  );
};
