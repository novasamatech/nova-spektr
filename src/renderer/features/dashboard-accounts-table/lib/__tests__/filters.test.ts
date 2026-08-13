import { type Chain } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import {
  type TableFilters,
  EMPTY_FILTERS,
  applyFilters,
  buildFilterChips,
  countActiveFilters,
  parseAmountInput,
  toggleListFilter,
} from '../filters';

import { makeRow } from './fixtures';

const ALICE = toAccountId('0x' + '11'.repeat(32));
const BOB = toAccountId('0x' + '22'.repeat(32));

describe('parseAmountInput', () => {
  it.each([
    ['100K', 100_000],
    ['1M', 1_000_000],
    ['$2,500', 2500],
    ['2.5k', 2500],
  ])('parses %s to %d', (input, expected) => {
    expect(parseAmountInput(input)).toEqual(expected);
  });

  it.each(['', '   '])('returns null for blank input %j', (input) => {
    expect(parseAmountInput(input)).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseAmountInput('abc')).toBeNull();
  });
});

describe('applyFilters', () => {
  const rowPolkadotVault = makeRow({
    accountId: ALICE,
    groupKey: 'alice',
    networkName: 'Polkadot',
    chain: { chainId: '0x91b1' } as unknown as Chain,
    walletTypeBucket: 'vault',
    fiat: { transferable: null, staked: null, governance: null, other: null, total: 500 },
  });
  const rowKusamaMultisig = makeRow({
    accountId: BOB,
    groupKey: 'bob',
    networkName: 'Kusama',
    chain: { chainId: '0xb0a8' } as unknown as Chain,
    walletTypeBucket: 'multisig',
    fiat: { transferable: null, staked: null, governance: null, other: null, total: 100 },
  });
  const rowPolkadotMultisig = makeRow({
    accountId: BOB,
    groupKey: 'bob',
    networkName: 'Polkadot',
    chain: { chainId: '0x91b1' } as unknown as Chain,
    walletTypeBucket: 'multisig',
    fiat: { transferable: null, staked: null, governance: null, other: null, total: null },
  });
  const rows = [rowPolkadotVault, rowKusamaMultisig, rowPolkadotMultisig];

  it('returns the same rows when filters are empty', () => {
    expect(applyFilters(rows, EMPTY_FILTERS)).toEqual(rows);
  });

  it('unions rows within a field (OR within networks)', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot', 'Kusama'] };

    expect(applyFilters(rows, filters)).toEqual(rows);
  });

  it('intersects across fields (AND between networks and walletTypes)', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot'], walletTypes: ['multisig'] };

    expect(applyFilters(rows, filters)).toEqual([rowPolkadotMultisig]);
  });

  it('filters chains by chainId', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, chains: ['0xb0a8'] };

    expect(applyFilters(rows, filters)).toEqual([rowKusamaMultisig]);
  });

  it('filters accounts by groupKey', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, accounts: ['alice'] };

    expect(applyFilters(rows, filters)).toEqual([rowPolkadotVault]);
  });

  it('drops rows with a null total when min is set', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, minTotalFiat: '100' };

    expect(applyFilters(rows, filters)).toEqual([rowPolkadotVault, rowKusamaMultisig]);
  });

  it('drops rows below min and keeps rows at the boundary (total === min passes)', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, minTotalFiat: '500' };

    expect(applyFilters(rows, filters)).toEqual([rowPolkadotVault]);
  });

  it('keeps null totals when min is empty', () => {
    expect(applyFilters(rows, EMPTY_FILTERS)).toContain(rowPolkadotMultisig);
  });

  it('preserves source order', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot', 'Kusama'] };

    expect(applyFilters(rows, filters).map((r) => r.id)).toEqual(rows.map((r) => r.id));
  });
});

describe('countActiveFilters', () => {
  it('returns 0 for EMPTY_FILTERS', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toEqual(0);
  });

  it('counts each selected value plus 1 for a non-empty min', () => {
    const filters: TableFilters = {
      networks: ['Polkadot', 'Kusama'],
      chains: ['0x91b1'],
      accounts: [],
      walletTypes: ['vault'],
      minTotalFiat: '100K',
    };

    expect(countActiveFilters(filters)).toEqual(5);
  });

  it('counts whitespace-only min as 0', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, minTotalFiat: '   ' };

    expect(countActiveFilters(filters)).toEqual(0);
  });
});

describe('toggleListFilter', () => {
  it('adds a value when absent', () => {
    const next = toggleListFilter(EMPTY_FILTERS, 'networks', 'Polkadot');

    expect(next.networks).toEqual(['Polkadot']);
  });

  it('removes a value when present', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot', 'Kusama'] };

    const next = toggleListFilter(filters, 'networks', 'Polkadot');

    expect(next.networks).toEqual(['Kusama']);
  });

  it('leaves other fields untouched', () => {
    const filters: TableFilters = {
      ...EMPTY_FILTERS,
      chains: ['0x91b1'],
      accounts: ['alice'],
      walletTypes: ['vault'],
      minTotalFiat: '100K',
    };

    const next = toggleListFilter(filters, 'networks', 'Polkadot');

    expect(next.chains).toEqual(filters.chains);
    expect(next.accounts).toEqual(filters.accounts);
    expect(next.walletTypes).toEqual(filters.walletTypes);
    expect(next.minTotalFiat).toEqual(filters.minTotalFiat);
  });
});

describe('buildFilterChips', () => {
  const labels = {
    field: (field: keyof TableFilters) => `field:${field}`,
    value: (field: keyof TableFilters, value: string) => `value:${field}:${value}`,
  };

  it('returns [] for EMPTY_FILTERS', () => {
    expect(buildFilterChips(EMPTY_FILTERS, labels)).toEqual([]);
  });

  it('builds one chip per selected value with composed labels', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot', 'Kusama'] };

    const chips = buildFilterChips(filters, labels);

    expect(chips).toHaveLength(2);
    expect(chips[0]).toMatchObject({ id: 'networks:Polkadot', label: 'field:networks: value:networks:Polkadot' });
    expect(chips[1]).toMatchObject({ id: 'networks:Kusama', label: 'field:networks: value:networks:Kusama' });
  });

  it('each chip next removes exactly that value, leaving the rest', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot', 'Kusama'] };

    const [chipPolkadot, chipKusama] = buildFilterChips(filters, labels);

    expect(chipPolkadot?.next.networks).toEqual(['Kusama']);
    expect(chipKusama?.next.networks).toEqual(['Polkadot']);
  });

  it('produces a min chip with id "min" whose next clears minTotalFiat', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, minTotalFiat: '100K' };

    const [minChip, ...rest] = buildFilterChips(filters, labels);

    expect(rest).toHaveLength(0);
    expect(minChip?.id).toEqual('min');
    expect(minChip?.label).toEqual('value:minTotalFiat:100K');
    expect(minChip?.next.minTotalFiat).toEqual('');
  });

  it('combines list chips and the min chip', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, accounts: ['alice'], minTotalFiat: '2500' };

    const chips = buildFilterChips(filters, labels);

    expect(chips.map((c) => c.id)).toEqual(['accounts:alice', 'min']);
  });
});
