import { BN, BN_ZERO } from '@polkadot/util';

import { type Address, type Asset, type Chain } from '@/shared/core';
import { buildCsv } from '@/shared/lib/csv';
import { toAccountId } from '@/shared/lib/utils';
import { type PurposeSplit } from '../balancePurpose';
import { type AccountsCsvHeaders, accountsCsvColumns, accountsCsvFileName, buildExportFilterParts } from '../csv';
import { type TableFilters, EMPTY_FILTERS } from '../filters';

import { makeRow } from './fixtures';

const ALICE = toAccountId('0x' + '11'.repeat(32));
const BOB = toAccountId('0x' + '22'.repeat(32));
const CAROL = toAccountId('0x' + '33'.repeat(32));

const HEADERS: AccountsCsvHeaders = {
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

const makeSplit = (params: {
  transferable: string;
  staked?: string | null;
  governance?: string | null;
  other?: string;
}): PurposeSplit => ({
  transferable: new BN(params.transferable),
  // `== null` deliberately treats undefined and null the same
  staked: params.staked == null ? null : new BN(params.staked),
  // `== null` deliberately treats undefined and null the same
  governance: params.governance == null ? null : new BN(params.governance),
  other: new BN(params.other ?? '0'),
});

describe('accountsCsvColumns', () => {
  test('columns render in the documented order, including the CSV-only identity columns', () => {
    const csv = buildCsv(accountsCsvColumns(HEADERS), []);

    expect(csv).toBe('Network,Chain,Account,Address,Asset,Transferable,Staked,Governance,Other,Total');
  });

  test('shapes a fully-populated row: SS58 address, symbol, full-precision tokens', () => {
    const split = makeSplit({
      transferable: '53800000000000000',
      staked: '20000000000',
      governance: '5000000000',
      other: '1000000000',
    });
    const row = makeRow({
      accountId: ALICE,
      networkName: 'Polkadot',
      chain: { chainId: '0xchain', name: 'Polkadot Asset Hub' } as unknown as Chain,
      displayName: 'Main',
      displayAddress: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5' as unknown as Address,
      asset: { symbol: 'DOT', precision: 10 } as unknown as Asset,
      split,
      totalBN: split.transferable
        .add(split.staked ?? BN_ZERO)
        .add(split.governance ?? BN_ZERO)
        .add(split.other),
    });

    const csv = buildCsv(accountsCsvColumns(HEADERS), [row]);
    const cells = csv.split('\r\n')[1]?.split(',');

    expect(cells).toEqual([
      'Polkadot',
      'Polkadot Asset Hub',
      'Main',
      '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
      'DOT',
      '5380000',
      '2',
      '0.5',
      '0.1',
      '5380002.6',
    ]);
  });

  test('null staked/governance buckets export as empty strings, never — or 0', () => {
    const split = makeSplit({ transferable: '10000000000', staked: null, governance: null, other: '0' });
    const row = makeRow({
      accountId: BOB,
      asset: { symbol: 'DOT', precision: 10 } as unknown as Asset,
      split,
      totalBN: split.transferable,
    });

    const csv = buildCsv(accountsCsvColumns(HEADERS), [row]);
    const cells = csv.split('\r\n')[1]?.split(',');

    expect(cells?.[6]).toBe(''); // staked
    expect(cells?.[7]).toBe(''); // governance
  });

  test('keeps full precision on a many-decimal amount — never abbreviated', () => {
    const split = makeSplit({ transferable: '12345678901', staked: null, governance: null, other: '0' });
    const row = makeRow({
      accountId: CAROL,
      asset: { symbol: 'DOT', precision: 10 } as unknown as Asset,
      split,
      totalBN: split.transferable,
    });

    const csv = buildCsv(accountsCsvColumns(HEADERS), [row]);
    const transferableCell = csv.split('\r\n')[1]?.split(',')[5];

    expect(transferableCell).toBe('1.2345678901');
    expect(transferableCell).not.toContain('M');
    expect(transferableCell).not.toContain('K');
  });
});

describe('accountsCsvFileName', () => {
  test('carries slugged parts and the local date', () => {
    // Local-time components, so the assertion holds in every timezone the suite
    // runs in — and so the name matches the day the user pressed Export.
    const noon = new Date(2026, 6, 27, 12, 0, 0);

    expect(accountsCsvFileName(['Polkadot Asset Hub', '2-chains'], noon)).toBe(
      'nova-spektr-accounts-polkadot-asset-hub-2-chains-2026-07-27.csv',
    );
  });

  test('uses the local date rather than the UTC one', () => {
    // 22:00 in UTC−5 is already the 28th in UTC; the export belongs to the 27th.
    const lateEvening = new Date(2026, 6, 27, 22, 0, 0);

    expect(accountsCsvFileName([], lateEvening)).toBe('nova-spektr-accounts-2026-07-27.csv');
  });

  test('drops empty and blank parts instead of leaving a gap', () => {
    const noon = new Date(2026, 6, 27, 12, 0, 0);

    expect(accountsCsvFileName(['', '  ', 'vault'], noon)).toBe('nova-spektr-accounts-vault-2026-07-27.csv');
  });
});

describe('buildExportFilterParts', () => {
  const noon = new Date(2026, 6, 27, 12, 0, 0);

  test('an empty filter set with no search contributes nothing', () => {
    expect(buildExportFilterParts(EMPTY_FILTERS, '')).toEqual([]);
  });

  test('network names are used directly', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, networks: ['Polkadot', 'Kusama'] };

    expect(buildExportFilterParts(filters, '')).toEqual(['Polkadot', 'Kusama']);
  });

  test('chains contribute a count, not the hex ids', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, chains: ['0xaaa', '0xbbb'] as TableFilters['chains'] };

    expect(buildExportFilterParts(filters, '')).toEqual(['2-chains']);
  });

  test('accounts contribute a count, not the hex group keys', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, accounts: ['0x1', '0x2', '0x3'] };

    expect(buildExportFilterParts(filters, '')).toEqual(['3-accounts']);
  });

  test('token symbols are used directly', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, assets: ['DOT', 'KSM'] };

    expect(buildExportFilterParts(filters, '')).toEqual(['DOT', 'KSM']);
  });

  test('a minimum amount contributes the raw input, slugged downstream', () => {
    const filters: TableFilters = { ...EMPTY_FILTERS, minTotalFiat: '100K' };

    expect(buildExportFilterParts(filters, '')).toEqual(['min-100K']);
    expect(accountsCsvFileName(buildExportFilterParts(filters, ''), noon)).toBe(
      'nova-spektr-accounts-min-100k-2026-07-27.csv',
    );
  });

  test('a non-empty search contributes only the word "search", never the query text', () => {
    expect(buildExportFilterParts(EMPTY_FILTERS, 'my secret alice')).toEqual(['search']);
  });

  test('a blank search contributes nothing', () => {
    expect(buildExportFilterParts(EMPTY_FILTERS, '   ')).toEqual([]);
  });

  test('combines every active filter in a stable order', () => {
    const filters: TableFilters = {
      networks: ['Polkadot'],
      chains: ['0xaaa'] as TableFilters['chains'],
      accounts: ['0x1', '0x2'],
      assets: ['DOT'],
      minTotalFiat: '1M',
    };

    expect(buildExportFilterParts(filters, 'query')).toEqual([
      'Polkadot',
      '1-chains',
      '2-accounts',
      'DOT',
      'min-1M',
      'search',
    ]);
  });
});
