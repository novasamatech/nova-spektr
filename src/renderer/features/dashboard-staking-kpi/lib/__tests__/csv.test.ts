import { type ChainId } from '@/shared/core';
import { buildCsv } from '@/shared/lib/csv';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type CsvClaimRow, type CsvPositionRow, claimCsvColumns, csvFileName, positionsCsvColumns } from '../csv';

const CLAIM_HEADERS = {
  account: 'Account',
  address: 'Address',
  network: 'Network',
  asset: 'Asset',
  earned: 'Earned',
  unclaimed: 'Unclaimed',
  eras: 'Eras',
};

const POSITION_HEADERS = {
  account: 'Account',
  address: 'Address',
  network: 'Network',
  asset: 'Asset',
  staked: 'Staked',
  unbonding: 'Unbonding',
  redeemable: 'Redeemable',
};

const claimRow: CsvClaimRow = {
  key: 'a',
  accountId: '0xa' as AccountId,
  chainId: '0xchain' as ChainId,
  chainName: 'Polkadot Asset Hub',
  symbol: 'DOT',
  precision: 10,
  earned: '712000000000000',
  unclaimed: '15000000000',
  unclaimedFiat: '9.5',
  eras: [1498, 1500],
  payouts: [],
  accessMode: 'direct',
  address: '15oF4u...',
  accountName: 'Main, staking',
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

describe('claim CSV shaping', () => {
  test('exports the visible address and full-precision tokens', () => {
    const csv = buildCsv(claimCsvColumns(CLAIM_HEADERS), [claimRow]);
    const [header, row] = csv.split('\r\n');

    expect(header).toBe('Account,Address,Network,Asset,Earned,Unclaimed,Eras');
    // the name contains a comma — it must be quoted, not split into two columns
    expect(row).toBe('"Main, staking",15oF4u...,Polkadot Asset Hub,DOT,71200,1.5,1498 1500');
  });

  test('a header row alone when there is nothing to export', () => {
    expect(buildCsv(claimCsvColumns(CLAIM_HEADERS), [])).toBe('Account,Address,Network,Asset,Earned,Unclaimed,Eras');
  });
});

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
    expect(csvFileName('rewards', new Date('2026-07-27T10:00:00Z'))).toBe('nova-spektr-staking-rewards-2026-07-27.csv');
    expect(csvFileName('positions', new Date('2026-07-27T10:00:00Z'))).toBe(
      'nova-spektr-staking-positions-2026-07-27.csv',
    );
  });
});
