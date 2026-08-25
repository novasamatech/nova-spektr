import { default as BigNumber } from 'bignumber.js';

import { type CsvColumn } from '@/shared/lib/csv';
import { type RawPayoutRow } from '../hooks/useRawRewardPayouts';

import { type AllocationRow } from './spread';
import { type PositionRow } from './types';

/**
 * Exported rows carry the **address the user sees** rather than a hex account
 * id, and full-precision token amounts rather than the abbreviated `5.38M` the
 * UI shows — a spreadsheet is where people do arithmetic.
 */
export type CsvPositionRow = PositionRow & { address: string; accountName: string };

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

/** Anything that would break a file name, folded away. */
function slug(part: string): string {
  return part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `nova-spektr-staking-reward-payouts-polkadot-30d-2026-07-27.csv`
 *
 * The filters that produced the file belong in its name: a folder of exports is
 * unreadable when three of them differ only by a network or a window nobody
 * wrote down. Empty parts are dropped rather than left as `--`.
 *
 * Stamped with the user's local date, not the UTC one: an export at 22:00 in
 * UTC−5 would otherwise be filed under tomorrow.
 */
export function csvFileName(
  kind: 'rewards' | 'positions' | 'reward-payouts' | 'allocation' | 'min-stake',
  options: { parts?: string[]; now?: Date } = {},
): string {
  const now = options.now ?? new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  const parts = (options.parts ?? []).map(slug).filter(Boolean);

  return `nova-spektr-staking-${[kind, ...parts, date].join('-')}.csv`;
}

export type RawPayoutCsvHeaders = {
  id: string;
  block: string;
  date: string;
  network: string;
  address: string;
  type: string;
  amount: string;
};

/**
 * The indexer's rows, unaggregated.
 *
 * `id` and `block` are what make the export reconcilable against the chain, so
 * they lead. The amount is still converted to whole tokens — planck is raw to a
 * machine and unreadable to a person, and this file is for a person.
 */
export function rawPayoutCsvColumns(
  headers: RawPayoutCsvHeaders,
  precisionByChain: Record<string, number>,
): CsvColumn<RawPayoutRow>[] {
  return [
    { header: headers.id, cell: (row) => row.id },
    { header: headers.block, cell: (row) => String(row.blockNumber) },
    { header: headers.date, cell: (row) => new Date(row.timestamp * 1000).toISOString() },
    { header: headers.network, cell: (row) => row.chainName },
    { header: headers.address, cell: (row) => row.address },
    { header: headers.type, cell: (row) => row.type },
    { header: headers.amount, cell: (row) => toTokens(row.amount, precisionByChain[row.chainId] ?? 0) },
  ];
}

export type AllocationCsvHeaders = {
  account: string;
  address: string;
  network: string;
  asset: string;
  validator: string;
  allocated: string;
  staked: string;
};

export type CsvAllocationRow = AllocationRow & {
  address: string;
  accountName: string;
  validatorAddress: string;
};

/**
 * Where the stake actually sits: one line per account → validator pair with the
 * amount the era put behind it, and the account's bonded total alongside so the
 * file answers both "how many accounts" and "how many tokens" without a pivot
 * table.
 */
export function allocationCsvColumns(headers: AllocationCsvHeaders): CsvColumn<CsvAllocationRow>[] {
  return [
    { header: headers.account, cell: (row) => row.accountName },
    { header: headers.address, cell: (row) => row.address },
    { header: headers.network, cell: (row) => row.chainName },
    { header: headers.asset, cell: (row) => row.symbol },
    { header: headers.validator, cell: (row) => row.validatorAddress },
    { header: headers.allocated, cell: (row) => toTokens(row.allocated, row.precision) },
    { header: headers.staked, cell: (row) => toTokens(row.positionTotal, row.precision) },
  ];
}
