import { type BN } from '@polkadot/util';

import { type CsvColumn } from '@/shared/lib/csv';

import { type TableFilters } from './filters';
import { toTokens } from './rows';
import { type AccountRow } from './types';

export type AccountsCsvHeaders = {
  network: string;
  chain: string;
  account: string;
  address: string;
  asset: string;
  transferable: string;
  staked: string;
  governance: string;
  other: string;
  total: string;
};

/** `null` bucket ("—" on screen) exports as an empty cell, never `—` or `0`. */
const bucketTokens = (value: BN | null, precision: number): string => {
  return value === null ? '' : toTokens(value.toString(), precision);
};

/**
 * One row per `AccountRow`, in the same column order the table shows.
 *
 * Address is `displayAddress` — the SS58 string the user sees, never the raw
 * `accountId` hex. Every numeric cell is a full-precision token amount via
 * `toTokens` (ungrouped, never abbreviated, never fiat) — a spreadsheet is
 * where people do arithmetic. `staked`/`governance` mirror the on-screen "—"
 * (bucket not applicable) as an empty string rather than a misleading `0`.
 */
export function accountsCsvColumns(headers: AccountsCsvHeaders): CsvColumn<AccountRow>[] {
  return [
    { header: headers.network, cell: (row) => row.networkName },
    { header: headers.chain, cell: (row) => row.chain.name },
    { header: headers.account, cell: (row) => row.displayName },
    { header: headers.address, cell: (row) => row.displayAddress },
    { header: headers.asset, cell: (row) => row.asset.symbol },
    { header: headers.transferable, cell: (row) => toTokens(row.split.transferable.toString(), row.asset.precision) },
    { header: headers.staked, cell: (row) => bucketTokens(row.split.staked, row.asset.precision) },
    { header: headers.governance, cell: (row) => bucketTokens(row.split.governance, row.asset.precision) },
    { header: headers.other, cell: (row) => toTokens(row.split.other.toString(), row.asset.precision) },
    { header: headers.total, cell: (row) => toTokens(row.totalBN.toString(), row.asset.precision) },
  ];
}

/**
 * Anything that would break a file name, folded away. Mirrors
 * `dashboard-staking-kpi/lib/csv.ts#slug`.
 */
function slug(part: string): string {
  return part
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `nova-spektr-accounts-<slugged parts…>-YYYY-MM-DD.csv`
 *
 * Mirrors `dashboard-staking-kpi/lib/csv.ts#csvFileName`: the filters that
 * produced the file belong in its name (see `buildExportFilterParts`), empty
 * parts are dropped rather than left as a gap, and the date is the user's local
 * date — an export at 22:00 in UTC−5 would otherwise be filed under tomorrow.
 */
export function accountsCsvFileName(parts: string[], now: Date = new Date()): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  const sluggedParts = parts.map(slug).filter(Boolean);

  return `nova-spektr-accounts-${[...sluggedParts, date].join('-')}.csv`;
}

/**
 * Turns the active table filters + search query into filename parts (see
 * `accountsCsvFileName`). Each part below is still raw — `accountsCsvFileName`
 * slugs it — this function only decides _what_ goes in, one part per active
 * filter, nothing for an inactive one:
 *
 * - `networks` — network names, used as-is; already short, human strings.
 * - `chains` — `ChainId`s are hex and unusable in a filename, so the filter
 *   contributes a count instead (`2-chains`), not the ids.
 * - `accounts` — group keys are `accountId` hex, same treatment (`3-accounts`).
 * - `assets` — token symbols (`KSM`, `DED`), short and readable, used as-is.
 * - `minTotalFiat` — the raw user input (`min-100K`), slugged downstream.
 * - `search` — a non-empty query contributes the literal word `search`, never the
 *   query text itself: the query can contain anything (a contact's name, an
 *   address fragment) that doesn't belong in a filename.
 */
export function buildExportFilterParts(filters: TableFilters, search: string): string[] {
  const parts: string[] = [...filters.networks];

  if (filters.chains.length > 0) parts.push(`${filters.chains.length}-chains`);
  if (filters.accounts.length > 0) parts.push(`${filters.accounts.length}-accounts`);
  parts.push(...filters.assets);
  if (filters.minTotalFiat.trim() !== '') parts.push(`min-${filters.minTotalFiat.trim()}`);
  if (search.trim() !== '') parts.push('search');

  return parts;
}
