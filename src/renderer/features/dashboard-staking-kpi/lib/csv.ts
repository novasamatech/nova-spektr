import { default as BigNumber } from 'bignumber.js';

import { type CsvColumn } from '@/shared/lib/csv';

import { type ClaimRow, type PositionRow } from './types';

/**
 * Exported rows carry the **address the user sees** rather than a hex account
 * id, and full-precision token amounts rather than the abbreviated `5.38M` the
 * UI shows — a spreadsheet is where people do arithmetic.
 */
export type CsvClaimRow = ClaimRow & { address: string; accountName: string };
export type CsvPositionRow = PositionRow & { address: string; accountName: string };

export type ClaimCsvHeaders = {
  account: string;
  address: string;
  network: string;
  asset: string;
  earned: string;
  unclaimed: string;
  eras: string;
};

export type PositionsCsvHeaders = {
  account: string;
  address: string;
  network: string;
  asset: string;
  staked: string;
  unbonding: string;
  redeemable: string;
};

/**
 * Planck → whole tokens at full precision, ungrouped and never abbreviated —
 * the opposite of what the cards show, and what a spreadsheet needs.
 */
function toTokens(amount: string, precision: number): string {
  return new BigNumber(amount || '0').shiftedBy(-precision).toFixed();
}

export function claimCsvColumns(headers: ClaimCsvHeaders): CsvColumn<CsvClaimRow>[] {
  return [
    { header: headers.account, cell: (row) => row.accountName },
    { header: headers.address, cell: (row) => row.address },
    { header: headers.network, cell: (row) => row.chainName },
    { header: headers.asset, cell: (row) => row.symbol },
    { header: headers.earned, cell: (row) => toTokens(row.earned, row.precision) },
    { header: headers.unclaimed, cell: (row) => toTokens(row.unclaimed, row.precision) },
    { header: headers.eras, cell: (row) => row.eras.join(' ') },
  ];
}

export function positionsCsvColumns(headers: PositionsCsvHeaders): CsvColumn<CsvPositionRow>[] {
  return [
    { header: headers.account, cell: (row) => row.accountName },
    { header: headers.address, cell: (row) => row.address },
    { header: headers.network, cell: (row) => row.chainName },
    { header: headers.asset, cell: (row) => row.symbol },
    { header: headers.staked, cell: (row) => toTokens(row.staked, row.precision) },
    { header: headers.unbonding, cell: (row) => toTokens(row.totalUnbonding, row.precision) },
    { header: headers.redeemable, cell: (row) => toTokens(row.redeemable, row.precision) },
  ];
}

/** `nova-spektr-staking-rewards-2026-07-27.csv` */
export function csvFileName(kind: 'rewards' | 'positions', now = new Date()): string {
  const date = now.toISOString().slice(0, 10);

  return `nova-spektr-staking-${kind}-${date}.csv`;
}
