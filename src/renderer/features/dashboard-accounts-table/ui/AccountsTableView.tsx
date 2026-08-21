import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, FootnoteText, IconButton, SmallTitleText } from '@/shared/ui';
import { SearchInput } from '@/shared/ui-kit';
import { type AccountsTableState } from '../hooks/useAccountsTable';

import { EmptyFiltered, NoBalances, NoSelection } from './EmptyStates';
import { FilterChips } from './FilterChips';
import { FiltersPopover } from './FiltersPopover';
import { GroupSection } from './GroupSection';
import { TableHeaderRow } from './TableHeaderRow';
import { TableSkeleton } from './TableSkeleton';

type Props = {
  table: AccountsTableState;
  /**
   * Chrome of the surface the table sits on — a card in the widget, nothing in
   * the full-screen view.
   */
  className?: string;
  /**
   * Control pinned to the very start of the header — the widget's "Full view"
   * button.
   */
  leadingAction?: ReactNode;
};

/**
 * The table itself — header controls, filters, rows, footer — with no opinion
 * about what holds it. Rendered by both the dashboard widget and the
 * full-screen view off one `useAccountsTable` instance.
 */
export const AccountsTableView = ({ table, className, leadingAction }: Props) => {
  const { t } = useI18n();

  const foldLabel = t(table.allOpen ? 'dashboard.accountsTable.collapseAll' : 'dashboard.accountsTable.expandAll');

  // Must be invoked as `{renderBody()}` below, never rendered as `<RenderBody />` —
  // as a component it would remount on every parent render instead of just
  // returning fresh JSX.
  const renderBody = () => {
    if (!table.hasSelection) return <NoSelection />;
    if (!table.ready) return <TableSkeleton />;
    if (table.visibleRows.length === 0 && (table.activeFilterCount > 0 || table.search.trim().length > 0)) {
      return <EmptyFiltered onClearFilters={table.clearAll} />;
    }
    if (table.rows.length === 0) {
      return <NoBalances />;
    }

    return (
      <>
        <TableHeaderRow
          sort={table.sort}
          foldAll={
            // Icon-only, so the label it lost has to survive somewhere a person
            // can reach it: `title` for the pointer, `ariaLabel` for everyone else.
            <span title={foldLabel} className="shrink-0">
              <IconButton
                name={table.allOpen ? 'arrowDoubleUp' : 'arrowDoubleDown'}
                size={14}
                ariaLabel={foldLabel}
                onClick={table.toggleAllGroups}
              />
            </span>
          }
          onSort={table.applySort}
        />
        {table.groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            open={table.isGroupOpen(group.key)}
            fiatVisible={table.fiatVisible}
            formatSubtotal={table.formatSubtotal}
            onToggle={table.toggleGroup}
          />
        ))}
      </>
    );
  };

  return (
    // `@container` makes this div the width the table measures itself against.
    // The widget is resizable (2–4 dashboard columns) and the same size means a
    // different pixel width on every window, so the column set has to key off
    // the surface's own width, never the viewport's — see `tableLayout`.
    <div className={cnTw('@container flex h-full flex-col overflow-hidden', className)}>
      {/* Wrapping rather than shrinking: every control here is either a text
          button or a search field that stops being usable once squeezed, so a
          narrow card gives them a second line instead of clipping the row. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-divider px-4 py-3.5">
        {leadingAction}

        {/* No row-count chip here: the footer already states the count, in the
            fuller form that also says how many accounts those rows are spread
            over. */}
        <SmallTitleText className="shrink-0">{t('dashboard.accountsTable.title')}</SmallTitleText>

        <div className="flex-1" />

        <div className="w-48 shrink-0">
          <SearchInput
            height="sm"
            value={table.search}
            placeholder={t('dashboard.accountsTable.searchPlaceholder')}
            onChange={table.setSearch}
          />
        </div>

        {/* All five filters live behind this one button — see `FiltersPopover`
            for why the permanent band went away. */}
        <FiltersPopover
          rows={table.rows}
          filters={table.filters}
          currencyCode={table.activeCurrency?.code ?? 'USD'}
          onChange={table.setFilters}
        />

        <span title={table.visibleRows.length === 0 ? t('dashboard.accountsTable.exportCsvEmpty') : undefined}>
          <Button
            variant="fill"
            pallet="secondary"
            size="sm"
            disabled={table.visibleRows.length === 0}
            onClick={table.exportCsv}
          >
            {t('dashboard.accountsTable.exportCsv')}
          </Button>
        </span>
      </div>

      <FilterChips chips={table.chips} onChange={table.setFilters} onClearAll={table.clearAll} />

      {/* Scrolls both ways: amounts never wrap (`AMOUNT_CELL_CLASS`), so at the
          widget's narrowest sizes the columns can out-measure the card — and a
          number cut off at the card's edge is worse than a scrollbar. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">{renderBody()}</div>

      {table.ready && table.hasSelection ? (
        <div className="flex h-10 shrink-0 items-center gap-3 border-t border-divider px-4">
          <FootnoteText className="shrink-0 text-text-secondary">
            {t('dashboard.accountsTable.footer.showing', {
              rows: table.visibleRows.length,
              total: table.rows.length,
              accounts: table.groups.length,
            })}
          </FootnoteText>

          <div className="flex-1" />

          <FootnoteText className="truncate text-text-tertiary">
            {t('dashboard.accountsTable.footer.note')}
          </FootnoteText>
        </div>
      ) : null}
    </div>
  );
};
