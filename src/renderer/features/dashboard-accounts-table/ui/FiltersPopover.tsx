import { type ReactNode, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, performSearch, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon } from '@/shared/ui';
import { AssetIcon, ChainIcon, Identicon } from '@/shared/ui-entities';
import { Checkbox, Input, Popover, SearchInput } from '@/shared/ui-kit';
import {
  type ListField,
  type TableFilters,
  countActiveFilters,
  parseAmountInput,
  toggleListFilter,
} from '../lib/filters';
import { type AccountRow } from '../lib/types';

type Props = {
  rows: AccountRow[];
  filters: TableFilters;
  currencyCode: string;
  onChange: (filters: TableFilters) => void;
};

type Option = {
  value: string;
  label: string;
  count: number;
  icon?: ReactNode;
  /**
   * Second line under the label — a token's full name. Displayed, therefore
   * searchable.
   */
  description?: string;
};

/**
 * Unique values in first-seen order, each paired with its display label, row
 * count and the glyph the table itself draws for that value — the chain icon,
 * the account's identicon, the token's icon. Label, description and icon come
 * from the first row that produced the value; every later row with the same
 * value is the same network / chain / account / token, so it would draw the
 * same.
 */
const buildOptions = (
  rows: AccountRow[],
  getEntry: (row: AccountRow) => { value: string; label: string; icon?: ReactNode; description?: string },
): Option[] => {
  const order: string[] = [];
  const labels = new Map<string, string>();
  const descriptions = new Map<string, string | undefined>();
  const icons = new Map<string, ReactNode>();
  const counts = new Map<string, number>();

  for (const row of rows) {
    const { value, label, icon, description } = getEntry(row);
    if (!counts.has(value)) {
      order.push(value);
      labels.set(value, label);
      descriptions.set(value, description);
      icons.set(value, icon);
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return order.map((value) => ({
    value,
    label: labels.get(value) ?? value,
    description: descriptions.get(value),
    icon: icons.get(value),
    count: counts.get(value) ?? 0,
  }));
};

const AMOUNT_PRESETS = ['100K', '1M'] as const;

const presetPillClass = (active: boolean): string =>
  cnTw(
    'flex h-6.5 items-center rounded-full border px-3 text-footnote',
    active
      ? 'border-primary-button-background-default bg-badge-background text-tab-text-accent'
      : 'border-filter-border text-text-secondary hover:bg-block-background',
  );

type Facet = {
  field: ListField;
  label: string;
  options: Option[];
  /**
   * Only the token facet: thirty-plus values is past the point where scanning
   * beats typing.
   */
  searchable?: boolean;
};

type FacetSectionProps = {
  facet: Facet;
  selected: string[];
  open: boolean;
  onToggleOpen: () => void;
  onPick: (value: string) => void;
};

const FacetSection = ({ facet, selected, open, onToggleOpen, onPick }: FacetSectionProps) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  // The query matches the two strings an option shows — its label and, for a
  // token, its full name — and nothing else: it is typed from what's on screen
  // (search-patterns rule). `performSearch` re-ranks by weight, so its result
  // only decides *which* options match; the list keeps its own order, in which
  // the values carrying the most rows come first.
  const visible = useMemo(() => {
    if (!facet.searchable || query.trim().length === 0) return facet.options;

    const matched = new Set(
      performSearch({ records: facet.options, query, weights: { label: 1, description: 0.5 } }).map(
        (option) => option.value,
      ),
    );

    return facet.options.filter((option) => matched.has(option.value));
  }, [facet.options, facet.searchable, query]);

  return (
    <div className="border-b border-divider last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-x-2 bg-block-background px-3 py-2 text-left hover:bg-block-background-hover"
        onClick={onToggleOpen}
      >
        <HelpText className="tracking-wide text-text-secondary uppercase">{facet.label}</HelpText>

        <div className="flex-1" />

        <HelpText className="text-text-tertiary">
          {selected.length === 0
            ? t('dashboard.accountsTable.filters.anyValue')
            : t('dashboard.accountsTable.filters.selectedCount', { count: selected.length })}
        </HelpText>

        <Icon name={open ? 'up' : 'down'} size={12} className="shrink-0 text-text-tertiary" />
      </button>

      {open ? (
        <div className="flex flex-col gap-y-0.5 p-2">
          {facet.searchable ? (
            <div className="px-1 pb-1">
              <SearchInput
                height="sm"
                value={query}
                placeholder={t('dashboard.accountsTable.filters.assetSearch')}
                onChange={setQuery}
              />
            </div>
          ) : null}

          <div className="flex max-h-56 flex-col gap-y-0.5 overflow-y-auto">
            {visible.map((option) => (
              // The row is the checkbox's own label — `Checkbox` renders a
              // button, so a wrapping button would nest one inside another.
              <div key={option.value} className="rounded-md px-1.5 py-1 hover:bg-block-background">
                <Checkbox checked={selected.includes(option.value)} onChange={() => onPick(option.value)}>
                  {option.icon ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">{option.icon}</span>
                  ) : null}

                  <span className="flex min-w-0 flex-col">
                    <FootnoteText className="truncate">{option.label}</FootnoteText>
                    {option.description ? (
                      <HelpText className="truncate text-text-tertiary">{option.description}</HelpText>
                    ) : null}
                  </span>

                  <FootnoteText className="ms-auto shrink-0 text-text-tertiary">{option.count}</FootnoteText>
                </Checkbox>
              </div>
            ))}

            {visible.length === 0 ? (
              <FootnoteText className="py-2 text-center text-text-tertiary">
                {t('dashboard.accountsTable.filters.assetEmpty')}
              </FootnoteText>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Every filter the table has, behind one button.
 *
 * Five permanent dropdowns cost a 44px band across the table that said "All"
 * five times over — the width of two data rows spent on the state "nothing is
 * filtered". Folded into a popover, the band is gone and what remains on screen
 * is what is actually true: the button carries a count when filters are on, and
 * the chips row below spells them out.
 *
 * Rules inside: a facet with a single value is dropped entirely (filtering by
 * the only network there is filters nothing); one facet is open at a time,
 * starting with the one that carries a selection; picking a value applies it
 * immediately, so there is no Apply button.
 */
export const FiltersPopover = ({ rows, filters, currencyCode, onChange }: Props) => {
  const { t } = useI18n();
  const [open, toggleOpen] = useToggle();

  // Every option carries the same glyph the table draws for that value, so a
  // filter list reads like the rows it filters: relay icon, chain icon,
  // identicon, token icon.
  const networkOptions = useMemo(
    () =>
      buildOptions(rows, (row) => ({
        value: row.networkName,
        label: row.networkName,
        icon: <ChainIcon chain={row.networkChain} size={16} />,
      })),
    [rows],
  );
  const chainOptions = useMemo(
    () =>
      buildOptions(rows, (row) => ({
        value: row.chain.chainId,
        label: row.chain.name,
        icon: <ChainIcon chain={row.chain} size={16} />,
      })),
    [rows],
  );
  const accountOptions = useMemo(
    () =>
      buildOptions(rows, (row) => ({
        value: row.groupKey,
        label: row.displayName,
        // No copy affordance: inside a checkbox row a click belongs to the checkbox.
        icon: <Identicon address={toAddress(row.accountId)} size={16} canCopy={false} />,
      })),
    [rows],
  );
  // Keyed by symbol, not by (chain, asset): "which of my accounts hold DED, and
  // where" is one question about one token, and the Chain column answers the
  // "where" half on the rows that survive the filter.
  const assetOptions = useMemo(
    () =>
      buildOptions(rows, (row) => ({
        value: row.asset.symbol,
        label: row.asset.symbol,
        description: row.asset.name,
        icon: <AssetIcon asset={row.asset} size={16} />,
      })),
    [rows],
  );

  const facets = useMemo<Facet[]>(
    () =>
      [
        { field: 'networks' as const, label: t('dashboard.accountsTable.filters.network'), options: networkOptions },
        { field: 'chains' as const, label: t('dashboard.accountsTable.filters.chain'), options: chainOptions },
        { field: 'accounts' as const, label: t('dashboard.accountsTable.filters.account'), options: accountOptions },
        {
          field: 'assets' as const,
          label: t('dashboard.accountsTable.filters.asset'),
          options: assetOptions,
          searchable: true,
        },
        // A facet whose every row shares one value filters nothing — it is a
        // list with one line and a checkbox that can only ever hide everything.
      ].filter((facet) => facet.options.length > 1),
    [t, networkOptions, chainOptions, accountOptions, assetOptions],
  );

  const activeCount = countActiveFilters(filters);
  const [openedFacet, setOpenedFacet] = useState<ListField | null>(null);
  // Falls back rather than being seeded in state: the facets themselves depend
  // on the rows, which arrive after the first render.
  const currentFacet =
    openedFacet ?? facets.find((facet) => filters[facet.field].length > 0)?.field ?? facets.at(0)?.field ?? null;

  const clearAll = () => onChange({ ...filters, networks: [], chains: [], accounts: [], assets: [], minTotalFiat: '' });

  return (
    <Popover dialog open={open} align="end" onToggle={toggleOpen}>
      <Popover.Trigger>
        <button
          type="button"
          className={cnTw(
            'flex h-8 shrink-0 items-center gap-x-1.5 rounded-lg px-2.5 text-footnote',
            activeCount > 0
              ? 'bg-primary-button-background-default text-white'
              : 'border border-filter-border text-text-secondary hover:bg-block-background',
          )}
        >
          {t('dashboard.accountsTable.filters.title')}

          {activeCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-sm bg-white/25 px-1 text-help-text font-semibold">
              {activeCount}
            </span>
          ) : (
            <Icon name="down" size={12} className="shrink-0 text-inherit" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <div className="flex w-76 flex-col">
          <div className="flex items-center gap-x-2 border-b border-divider px-3 py-2.5">
            <FootnoteText className="font-semibold">{t('dashboard.accountsTable.filters.title')}</FootnoteText>

            <div className="flex-1" />

            <button
              type="button"
              disabled={activeCount === 0}
              className={cnTw(
                'text-footnote',
                activeCount === 0 ? 'text-text-tertiary' : 'text-tab-text-accent hover:underline',
              )}
              onClick={clearAll}
            >
              {t('dashboard.accountsTable.clearAll')}
            </button>
          </div>

          {facets.map((facet) => (
            <FacetSection
              key={facet.field}
              facet={facet}
              selected={filters[facet.field]}
              open={currentFacet === facet.field}
              onToggleOpen={() => setOpenedFacet(currentFacet === facet.field ? null : facet.field)}
              onPick={(value) => onChange(toggleListFilter(filters, facet.field, value))}
            />
          ))}

          {/* Not an accordion facet: it is one input, and hiding an input behind
              a row costs more than the row saves. */}
          <div className="flex flex-col gap-y-2 border-t border-divider p-3">
            <HelpText className="tracking-wide text-text-secondary uppercase">
              {t('dashboard.accountsTable.filters.amountTitle', { currency: currencyCode })}
            </HelpText>

            <Input
              height="sm"
              width="full"
              inputMode="decimal"
              value={filters.minTotalFiat}
              placeholder={t('dashboard.accountsTable.filters.amountPlaceholder')}
              onChange={(minTotalFiat) => onChange({ ...filters, minTotalFiat })}
            />

            <div className="flex flex-wrap gap-1.5">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={presetPillClass(filters.minTotalFiat === preset)}
                  onClick={() => onChange({ ...filters, minTotalFiat: preset })}
                >
                  {t('dashboard.accountsTable.filters.presetMin', { value: `$${preset}` })}
                </button>
              ))}
              <button
                type="button"
                className={presetPillClass(parseAmountInput(filters.minTotalFiat) === null)}
                onClick={() => onChange({ ...filters, minTotalFiat: '' })}
              >
                {t('dashboard.accountsTable.filters.presetAny')}
              </button>
            </div>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
};
