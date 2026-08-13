import { type ReactNode, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { Dropdown, Input, Popover } from '@/shared/ui-kit';
import { type TableFilters, countActiveFilters, parseAmountInput, toggleListFilter } from '../lib/filters';
import { type AccountRow, type WalletTypeBucket } from '../lib/types';

type Props = {
  rows: AccountRow[];
  filters: TableFilters;
  currencyCode: string;
  onChange: (filters: TableFilters) => void;
};

type Option<T extends string> = { value: T; label: string; count: number };

/**
 * Unique values in first-seen order, each paired with its display label and row
 * count.
 */
const buildOptions = <T extends string>(
  rows: AccountRow[],
  getEntry: (row: AccountRow) => { value: T; label: string },
): Option<T>[] => {
  const order: T[] = [];
  const labels = new Map<T, string>();
  const counts = new Map<T, number>();

  for (const row of rows) {
    const { value, label } = getEntry(row);
    if (!counts.has(value)) {
      order.push(value);
      labels.set(value, label);
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return order.map((value) => ({ value, label: labels.get(value) ?? value, count: counts.get(value) ?? 0 }));
};

const TRIGGER_CLASS = cnTw(
  'flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-filter-border px-2.5',
  'text-footnote text-text-secondary hover:bg-block-background',
  'data-[state=open]:border-primary-button-background-default data-[state=open]:text-text-primary',
);

const TriggerButton = ({ children }: { children: ReactNode }) => (
  <button type="button" className={TRIGGER_CLASS}>
    <span className="truncate">{children}</span>
    <Icon name="down" size={12} className="shrink-0 text-inherit" />
  </button>
);

type CheckboxDropdownProps<T extends string> = {
  fieldLabel: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
};

const CheckboxDropdown = <T extends string>({ fieldLabel, options, selected, onToggle }: CheckboxDropdownProps<T>) => {
  const { t } = useI18n();
  const [open, toggleOpen] = useToggle();

  const triggerLabel =
    selected.length === 0
      ? t('dashboard.accountsTable.filters.all', { label: fieldLabel })
      : selected.length === 1
        ? t('dashboard.accountsTable.filters.one', {
            label: fieldLabel,
            value: options.find((option) => option.value === selected[0])?.label ?? selected[0],
          })
        : t('dashboard.accountsTable.filters.many', { label: fieldLabel, count: selected.length });

  return (
    <Dropdown open={open} keepOpen onToggle={toggleOpen}>
      <Dropdown.Trigger>
        <TriggerButton>{triggerLabel}</TriggerButton>
      </Dropdown.Trigger>
      <Dropdown.Content>
        {options.map((option) => (
          <Dropdown.CheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onChange={() => onToggle(option.value)}
          >
            <span className="flex flex-1 items-center justify-between gap-2">
              <span className="truncate">{option.label}</span>
              <span className="shrink-0 text-text-tertiary">{option.count}</span>
            </span>
          </Dropdown.CheckboxItem>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );
};

const AMOUNT_PRESETS = ['100K', '1M'] as const;

const presetPillClass = (active: boolean): string =>
  cnTw(
    'flex h-6.5 items-center rounded-full border px-3 text-footnote',
    active
      ? 'border-primary-button-background-default bg-badge-background text-tab-text-accent'
      : 'border-filter-border text-text-secondary hover:bg-block-background',
  );

const AmountPopover = ({
  currencyCode,
  minTotalFiat,
  onChange,
}: {
  currencyCode: string;
  minTotalFiat: string;
  onChange: (value: string) => void;
}) => {
  const { t } = useI18n();
  const [open, toggleOpen] = useToggle();

  const triggerLabel =
    parseAmountInput(minTotalFiat) === null
      ? t('dashboard.accountsTable.filters.amountAny')
      : t('dashboard.accountsTable.filters.amountMin', { value: minTotalFiat });

  return (
    <Popover dialog open={open} align="start" onToggle={toggleOpen}>
      <Popover.Trigger>
        <TriggerButton>{triggerLabel}</TriggerButton>
      </Popover.Trigger>
      <Popover.Content>
        <div className="flex w-60 flex-col gap-y-3 p-3">
          <FootnoteText className="text-text-secondary">
            {t('dashboard.accountsTable.filters.amountTitle', { currency: currencyCode })}
          </FootnoteText>

          <Input
            height="sm"
            width="full"
            inputMode="decimal"
            value={minTotalFiat}
            placeholder={t('dashboard.accountsTable.filters.amountPlaceholder')}
            onChange={onChange}
          />

          <div className="flex flex-wrap gap-1.5">
            {AMOUNT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={presetPillClass(minTotalFiat === preset)}
                onClick={() => onChange(preset)}
              >
                {t('dashboard.accountsTable.filters.presetMin', { value: `$${preset}` })}
              </button>
            ))}
            <button type="button" className={presetPillClass(minTotalFiat === '')} onClick={() => onChange('')}>
              {t('dashboard.accountsTable.filters.presetAny')}
            </button>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
};

export const FilterBar = ({ rows, filters, currencyCode, onChange }: Props) => {
  const { t } = useI18n();

  const networkOptions = useMemo(
    () => buildOptions(rows, (row) => ({ value: row.networkName, label: row.networkName })),
    [rows],
  );
  const chainOptions = useMemo(
    () => buildOptions<ChainId>(rows, (row) => ({ value: row.chain.chainId, label: row.chain.name })),
    [rows],
  );
  const accountOptions = useMemo(
    () => buildOptions(rows, (row) => ({ value: row.groupKey, label: row.displayName })),
    [rows],
  );
  const walletTypeOptions = useMemo(
    () =>
      buildOptions<WalletTypeBucket>(rows, (row) => ({
        value: row.walletTypeBucket,
        label: t(`dashboard.accountsTable.walletTypes.${row.walletTypeBucket}`),
      })),
    [rows, t],
  );

  const activeCount = countActiveFilters(filters);

  return (
    <div className="flex items-center gap-3 border-b border-divider px-4 py-3">
      <CheckboxDropdown
        fieldLabel={t('dashboard.accountsTable.filters.network')}
        options={networkOptions}
        selected={filters.networks}
        onToggle={(value) => onChange(toggleListFilter(filters, 'networks', value))}
      />

      <CheckboxDropdown
        fieldLabel={t('dashboard.accountsTable.filters.chain')}
        options={chainOptions}
        selected={filters.chains}
        onToggle={(value) => onChange(toggleListFilter(filters, 'chains', value))}
      />

      <CheckboxDropdown
        fieldLabel={t('dashboard.accountsTable.filters.account')}
        options={accountOptions}
        selected={filters.accounts}
        onToggle={(value) => onChange(toggleListFilter(filters, 'accounts', value))}
      />

      <CheckboxDropdown
        fieldLabel={t('dashboard.accountsTable.filters.walletType')}
        options={walletTypeOptions}
        selected={filters.walletTypes}
        onToggle={(value) => onChange(toggleListFilter(filters, 'walletTypes', value))}
      />

      <AmountPopover
        currencyCode={currencyCode}
        minTotalFiat={filters.minTotalFiat}
        onChange={(minTotalFiat) => onChange({ ...filters, minTotalFiat })}
      />

      <div className="ms-auto" />

      {activeCount > 0 ? (
        <FootnoteText className="shrink-0 rounded-full border border-primary-button-background-default bg-badge-background px-3 py-1 text-tab-text-accent">
          {t('dashboard.accountsTable.activeFilters', { count: activeCount })}
        </FootnoteText>
      ) : null}
    </div>
  );
};
