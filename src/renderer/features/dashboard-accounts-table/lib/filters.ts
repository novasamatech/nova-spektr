import { type ChainId } from '@/shared/core';

import { type AccountRow, type WalletTypeBucket } from './types';

export type TableFilters = {
  networks: string[];
  chains: ChainId[];
  accounts: string[]; // groupKeys
  walletTypes: WalletTypeBucket[];
  minTotalFiat: string; // raw user input: '100K', '1M', '2500'
};

export const EMPTY_FILTERS: TableFilters = {
  networks: [],
  chains: [],
  accounts: [],
  walletTypes: [],
  minTotalFiat: '',
};

export const parseAmountInput = (value: string): number | null => {
  const trimmed = value
    .trim()
    .replace(/[$,\s]/g, '')
    .toLowerCase();
  if (trimmed === '') return null;
  const multiplier = trimmed.endsWith('m') ? 1e6 : trimmed.endsWith('k') ? 1e3 : 1;
  const parsed = Number.parseFloat(trimmed);

  return Number.isNaN(parsed) ? null : parsed * multiplier;
};

export const applyFilters = (rows: AccountRow[], filters: TableFilters): AccountRow[] => {
  const min = parseAmountInput(filters.minTotalFiat);

  return rows.filter((row) => {
    if (filters.networks.length > 0 && !filters.networks.includes(row.networkName)) return false;
    if (filters.chains.length > 0 && !filters.chains.includes(row.chain.chainId)) return false;
    if (filters.accounts.length > 0 && !filters.accounts.includes(row.groupKey)) return false;
    if (filters.walletTypes.length > 0 && !filters.walletTypes.includes(row.walletTypeBucket)) return false;
    if (min !== null && (row.fiat.total === null || row.fiat.total < min)) return false;

    return true;
  });
};

const hasMinFilter = (filters: TableFilters): boolean => filters.minTotalFiat.trim() !== '';

export const countActiveFilters = (filters: TableFilters): number => {
  return (
    filters.networks.length +
    filters.chains.length +
    filters.accounts.length +
    filters.walletTypes.length +
    (hasMinFilter(filters) ? 1 : 0)
  );
};

export type FilterChip = { id: string; label: string; next: TableFilters };

export type ChipLabels = {
  field: (field: keyof TableFilters) => string;
  value: (field: keyof TableFilters, value: string) => string;
};

/** Removes a single occurrence of `value` from `list`, preserving order. */
const removeValue = <T>(list: readonly T[], value: T): T[] => list.filter((item) => item !== value);

const LIST_FIELDS = ['networks', 'chains', 'accounts', 'walletTypes'] as const;

export const buildFilterChips = (filters: TableFilters, labels: ChipLabels): FilterChip[] => {
  const chips: FilterChip[] = [];

  for (const field of LIST_FIELDS) {
    const values = filters[field];
    for (const value of values) {
      chips.push({
        id: `${field}:${value}`,
        label: `${labels.field(field)}: ${labels.value(field, value)}`,
        next: { ...filters, [field]: removeValue(values, value) },
      });
    }
  }
  if (hasMinFilter(filters)) {
    chips.push({
      id: 'min',
      label: labels.value('minTotalFiat', filters.minTotalFiat),
      next: { ...filters, minTotalFiat: '' },
    });
  }

  return chips;
};
