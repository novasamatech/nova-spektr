import { type TableSort } from '@/shared/ui-kit';
import { type NominationStatus } from '@/domains/staking';

import { comparePlanck } from './position-metrics';
import { type NominationRow } from './types';

/** Columns of the drawer's nominations table the header can sort by. */
export type NominationSortColumn = 'status' | 'ourStake' | 'apy' | 'eraPoints';

/**
 * Status first, so the nominations that earn are the ones on screen without
 * scrolling. This is a table the user opens to find out what is wrong with a
 * position, and the answer is never in alphabetical order.
 */
export const DEFAULT_NOMINATION_SORT = { column: 'status', direction: 'asc' } as const satisfies TableSort;

/**
 * Earning, then dropped out, then not elected — the same order the KPI row's
 * nomination spread uses, so the two surfaces never disagree about which
 * problem is the worse one. A drop-out is actionable (the validator is elected
 * and oversubscribed); not being elected is the validator's own problem.
 */
const STATUS_RANK: Record<NominationStatus, number> = { active: 0, droppedOut: 1, waiting: 2 };

/**
 * `null` sinks to the bottom in both directions: an unknown value is not a
 * small one, and floating it to the top of a descending sort buries the rows
 * the user opened the table for.
 */
function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  return a - b;
}

/** Not exposed reads as no stake here — the row is real, the amount is zero. */
function compareStake(a: string | null, b: string | null): number {
  return comparePlanck(a ?? '0', b ?? '0');
}

export function sortNominationRows(
  rows: NominationRow[],
  column: NominationSortColumn,
  direction: 'asc' | 'desc',
): NominationRow[] {
  const sign = direction === 'desc' ? -1 : 1;

  const compare = (a: NominationRow, b: NominationRow): number => {
    switch (column) {
      case 'status':
        // Ties inside a status band keep the biggest stake first, or the table
        // reshuffles its ten active rows on every re-render for no reason.
        return sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]) || -compareStake(a.ourStake, b.ourStake);
      case 'ourStake':
        return sign * compareStake(a.ourStake, b.ourStake);
      case 'apy':
      case 'eraPoints': {
        const result = compareNullableNumber(a[column], b[column]);

        // The null sentinel is direction-independent; only real values flip.
        return a[column] === null || b[column] === null ? result : sign * result;
      }
    }
  };

  return [...rows].sort(compare);
}

export function isNominationSortColumn(value: string): value is NominationSortColumn {
  return value === 'status' || value === 'ourStake' || value === 'apy' || value === 'eraPoints';
}
