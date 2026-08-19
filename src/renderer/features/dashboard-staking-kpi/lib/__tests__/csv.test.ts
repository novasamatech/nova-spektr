import { type ChainId } from '@/shared/core';
import { buildCsv } from '@/shared/lib/csv';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CsvPositionRow, csvFileName, positionsCsvColumns } from '../csv';

const POSITION_HEADERS = {
  account: 'Account',
  address: 'Address',
  network: 'Network',
  asset: 'Asset',
  staked: 'Staked',
  unbonding: 'Unbonding',
  redeemable: 'Redeemable',
};

const positionRow: CsvPositionRow = {
  key: 'a',
  accountId: '0xa' as AccountId,
  chainId: '0xchain' as ChainId,
  chainName: 'Polkadot Asset Hub',
  symbol: 'DOT',
  precision: 10,
  staked: '53800000000000000',
  stakedFiat: '29600000',
  unbonding: [],
  totalUnbonding: '500000000000',
  redeemable: '240000000000',
  accessMode: 'direct',
  address: '15oF4u...',
  accountName: 'Main',
};

describe('positions CSV shaping', () => {
  test('splits staked, unbonding and redeemable into their own columns', () => {
    const csv = buildCsv(positionsCsvColumns(POSITION_HEADERS), [positionRow]);
    const [header, row] = csv.split('\r\n');

    expect(header).toBe('Account,Address,Network,Asset,Staked,Unbonding,Redeemable');
    expect(row).toBe('Main,15oF4u...,Polkadot Asset Hub,DOT,5380000,50,24');
  });

  test('never abbreviates — a spreadsheet must be able to add the column up', () => {
    const csv = buildCsv(positionsCsvColumns(POSITION_HEADERS), [positionRow]);
    const stakedCell = csv.split('\r\n')[1]?.split(',')[4];

    expect(stakedCell).toBe('5380000');
    expect(stakedCell).not.toContain('M');
  });

  test('a fractional amount keeps its decimals', () => {
    const csv = buildCsv(positionsCsvColumns(POSITION_HEADERS), [{ ...positionRow, staked: '12345678901' }]);

    expect(csv.split('\r\n')[1]?.split(',')[4]).toBe('1.2345678901');
  });
});

describe('file name', () => {
  test('carries the export kind and the date', () => {
    // Local-time components, so the assertion holds in every timezone the suite
    // runs in — and so the name matches the day the user pressed Export.
    const noon = new Date(2026, 6, 27, 12, 0, 0);

    expect(csvFileName('rewards', { now: noon })).toBe('nova-spektr-staking-rewards-2026-07-27.csv');
    expect(csvFileName('positions', { now: noon })).toBe('nova-spektr-staking-positions-2026-07-27.csv');
  });

  test('uses the local date rather than the UTC one', () => {
    // 22:00 in UTC−5 is already the 28th in UTC; the export belongs to the 27th.
    const lateEvening = new Date(2026, 6, 27, 22, 0, 0);

    expect(csvFileName('rewards', { now: lateEvening })).toBe('nova-spektr-staking-rewards-2026-07-27.csv');
  });

  test('writes the filters into the name', () => {
    const noon = new Date(2026, 6, 27, 12, 0, 0);

    expect(csvFileName('reward-payouts', { parts: ['Polkadot Asset Hub', '30d'], now: noon })).toBe(
      'nova-spektr-staking-reward-payouts-polkadot-asset-hub-30d-2026-07-27.csv',
    );
  });

  test('drops a filter that resolved to nothing instead of leaving a gap', () => {
    const noon = new Date(2026, 6, 27, 12, 0, 0);

    expect(csvFileName('reward-payouts', { parts: ['', '7d'], now: noon })).toBe(
      'nova-spektr-staking-reward-payouts-7d-2026-07-27.csv',
    );
  });
});
