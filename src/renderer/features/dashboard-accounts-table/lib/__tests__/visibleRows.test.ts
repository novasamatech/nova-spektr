import { BN, BN_ZERO } from '@polkadot/util';

import { type Asset, type Chain } from '@/shared/core';
import { buildCsv } from '@/shared/lib/csv';
import { toAccountId } from '@/shared/lib/utils';
import { accountsCsvColumns, buildExportFilterParts } from '../csv';
import { type TableFilters, EMPTY_FILTERS } from '../filters';
import { DEFAULT_SORT } from '../sorting';
import { buildVisibleGroups, collectVisibleRows } from '../visibleRows';

import { makeRow } from './fixtures';

const ALICE = toAccountId('0x' + '11'.repeat(32));
const BOB = toAccountId('0x' + '22'.repeat(32));

const chain = (name: string, chainId: string) => ({ chainId, name }) as unknown as Chain;
const asset = (symbol: string) => ({ symbol, precision: 10 }) as unknown as Asset;

// A row the CSV builder can actually read: it walks every bucket of the split.
const split = { transferable: new BN(10), staked: null, governance: null, other: BN_ZERO };

const alicePolkadot = makeRow({
  id: 'alice-polkadot-dot',
  accountId: ALICE,
  groupKey: 'alice',
  displayName: 'Alice',
  networkName: 'Polkadot',
  chain: chain('Polkadot', '0x91b1'),
  asset: asset('DOT'),
  split,
  totalBN: new BN(10),
  fiat: { transferable: null, staked: null, governance: null, other: null, total: 500 },
});
const aliceKusama = makeRow({
  id: 'alice-kusama-ksm',
  accountId: ALICE,
  groupKey: 'alice',
  displayName: 'Alice',
  networkName: 'Kusama',
  chain: chain('Kusama', '0xb0a8'),
  asset: asset('KSM'),
  split,
  totalBN: new BN(10),
  fiat: { transferable: null, staked: null, governance: null, other: null, total: 300 },
});
const bobPolkadot = makeRow({
  id: 'bob-polkadot-dot',
  accountId: BOB,
  groupKey: 'bob',
  displayName: 'Bob',
  networkName: 'Polkadot',
  chain: chain('Polkadot', '0x91b1'),
  asset: asset('DOT'),
  split,
  totalBN: new BN(10),
  fiat: { transferable: null, staked: null, governance: null, other: null, total: 100 },
});

const rows = [alicePolkadot, aliceKusama, bobPolkadot];

const visibleIds = (search: string, filters: TableFilters = EMPTY_FILTERS) =>
  collectVisibleRows(buildVisibleGroups({ rows, search, filters, sort: DEFAULT_SORT })).map((row) => row.id);

describe('buildVisibleGroups', () => {
  it('shows every row when nothing is searched or filtered', () => {
    expect(visibleIds('')).toEqual(['alice-polkadot-dot', 'alice-kusama-ksm', 'bob-polkadot-dot']);
  });

  it('drops the rows a filter excludes', () => {
    expect(visibleIds('', { ...EMPTY_FILTERS, assets: ['KSM'] })).toEqual(['alice-kusama-ksm']);
  });

  it('drops the rows a search excludes', () => {
    expect(visibleIds('Bob')).toEqual(['bob-polkadot-dot']);
  });

  it('intersects search with filters', () => {
    expect(visibleIds('Alice', { ...EMPTY_FILTERS, networks: ['Kusama'] })).toEqual(['alice-kusama-ksm']);
  });

  it('groups by account, so rows come out account by account rather than globally ranked', () => {
    // Bob's row (100) outranks Alice's Kusama row (300 → 500 first) only inside
    // its own account: a global sort by total would interleave the two accounts.
    expect(visibleIds('')).toEqual(['alice-polkadot-dot', 'alice-kusama-ksm', 'bob-polkadot-dot']);
  });
});

describe('CSV export follows the table', () => {
  const headers = {
    network: 'Network',
    chain: 'Chain',
    account: 'Account',
    address: 'Address',
    asset: 'Asset',
    transferable: 'Transferable',
    staked: 'Staked',
    governance: 'Governance',
    other: 'Other',
    total: 'Total',
  };

  const exportCsv = (search: string, filters: TableFilters) =>
    buildCsv(
      accountsCsvColumns(headers),
      collectVisibleRows(buildVisibleGroups({ rows, search, filters, sort: DEFAULT_SORT })),
    );

  it('exports only what a filter left on screen', () => {
    const csv = exportCsv('', { ...EMPTY_FILTERS, assets: ['KSM'] });

    expect(csv).toContain('KSM');
    // Both DOT rows were filtered out, so neither account's DOT row may appear.
    expect(csv).not.toContain('DOT');
    expect(csv.trim().split('\n')).toHaveLength(2); // header + one row
  });

  it('exports only what a search left on screen', () => {
    const csv = exportCsv('Bob', EMPTY_FILTERS);

    expect(csv).toContain('Bob');
    expect(csv).not.toContain('Alice');
  });

  it('exports the rows in the on-screen order', () => {
    const csv = exportCsv('', EMPTY_FILTERS);
    const [, ...body] = csv.trim().split('\n');

    expect(body.map((line) => line.split(',')[2])).toEqual(['Alice', 'Alice', 'Bob']);
  });

  it('names the file after the filters that produced it, never after the query text', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot'], assets: ['DOT'] };

    expect(buildExportFilterParts(filters, 'a private note')).toEqual(['Polkadot', 'DOT', 'search']);
  });

  it('has nothing to export when filters match nothing — which is what disables the button', () => {
    const empty = collectVisibleRows(
      buildVisibleGroups({ rows, search: 'nobody', filters: EMPTY_FILTERS, sort: DEFAULT_SORT }),
    );

    expect(empty).toEqual([]);
  });
});
