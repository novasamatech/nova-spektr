import BigNumber from 'bignumber.js';

import { type CsvColumn } from '@/shared/lib/csv';
import { type MinStakeRow } from '../hooks/useMinStakeRows';

export type MinStakeCsvHeaders = {
  network: string;
  era: string;
  date: string;
  minStake: string;
  change: string;
  validators: string;
};

export type CsvMinStakeRow = {
  row: MinStakeRow;
  /** The era drawn before this one — the change column is against it. */
  previous: MinStakeRow | undefined;
  chainName: string;
  precision: number;
  /** ISO date (`yyyy-MM-dd`), or empty where the card shows none. */
  date: string;
};

/**
 * Planck → whole tokens at full precision, ungrouped and never abbreviated —
 * the opposite of what the card shows, and what a spreadsheet needs.
 */
function toTokens(planck: string, precision: number): string {
  return new BigNumber(planck || '0').shiftedBy(-precision).toFixed();
}

/**
 * One line per era, oldest first — the order the chart draws. The change column
 * is a signed token amount against the previous era of the file; the first era
 * has no previous and exports an empty cell rather than a zero that would claim
 * the threshold did not move.
 */
export function minStakeCsvColumns(headers: MinStakeCsvHeaders): CsvColumn<CsvMinStakeRow>[] {
  return [
    { header: headers.network, cell: (entry) => entry.chainName },
    { header: headers.era, cell: (entry) => String(entry.row.era) },
    { header: headers.date, cell: (entry) => entry.date },
    { header: headers.minStake, cell: (entry) => toTokens(entry.row.minStake, entry.precision) },
    {
      header: headers.change,
      cell: (entry) =>
        entry.previous
          ? new BigNumber(entry.row.minStake).minus(entry.previous.minStake).shiftedBy(-entry.precision).toFixed()
          : '',
    },
    { header: headers.validators, cell: (entry) => String(entry.row.validatorCount) },
  ];
}
