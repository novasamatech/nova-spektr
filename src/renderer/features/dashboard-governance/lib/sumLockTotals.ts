import { default as BigNumber } from 'bignumber.js';

import { type GovernanceLockRow } from './buildLockRows';

/** Fiat totals over every row on screen, as decimal strings. */
export type LockTotals = {
  claimable: string;
  pending: string;
  delegated: string;
};

const add = (sum: BigNumber, fiat: string | null) => (fiat ? sum.plus(fiat) : sum);

/**
 * The strip above the table: what the selected accounts can release now, what
 * is still held, and what is delegated — summed in fiat because DOT and KSM do
 * not add. A row's missing fiat (zero amount, or no price) counts as nothing.
 * Reading the rows rather than the chain totals keeps the strip and the table
 * in agreement: a stale class lock that makes a row is in the total too.
 */
export function sumLockTotals(rows: GovernanceLockRow[]): LockTotals {
  let claimable = new BigNumber(0);
  let pending = new BigNumber(0);
  let delegated = new BigNumber(0);

  for (const row of rows) {
    claimable = add(claimable, row.claimableFiat);
    pending = add(pending, row.pendingFiat);
    delegated = add(delegated, row.delegatedFiat);
  }

  return { claimable: claimable.toString(), pending: pending.toString(), delegated: delegated.toString() };
}
