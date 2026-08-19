import { type PositionStatus } from '@/domains/staking';

import { comparePlanck } from './position-metrics';
import { type PositionRow } from './types';

/** Columns the header can sort by, keyed exactly as the table's columns are. */
export type PositionSortColumn = 'staked' | 'sharePercent' | 'status' | 'apy' | 'activeValidatorCount';

export const DEFAULT_SORT = { column: 'staked', direction: 'desc' } as const;

/**
 * Earning first, dead last — the order a user scanning for problems wants.
 *
 * `unknown` sorts next to `active` rather than beside the problems: a position
 * whose exposures are still loading is far more often earning than not, and
 * parking it at the bottom would make rows jump the length of the table the
 * moment the read lands.
 */
const STATUS_RANK: Record<PositionStatus, number> = {
  active: 0,
  unknown: 1,
  waiting: 2,
  inactive: 3,
  bonded: 4,
};

/**
 * `null` APY always sinks to the bottom, in both directions: an unknown value
 * is not a small one, and floating it to the top of a descending sort would put
 * the least informative rows where the most interesting ones belong.
 */
function compareNullableNumber(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  return a - b;
}

export function sortPositionRows(rows: PositionRow[], column: PositionSortColumn, direction: 'asc' | 'desc') {
  const sign = direction === 'desc' ? -1 : 1;

  const compare = (a: PositionRow, b: PositionRow): number => {
    switch (column) {
      case 'staked':
        return sign * comparePlanck(a.staked, b.staked);
      case 'sharePercent':
        return sign * (a.sharePercent - b.sharePercent);
      case 'status':
        return sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
      case 'activeValidatorCount':
        return sign * (a.activeValidatorCount - b.activeValidatorCount);
      case 'apy': {
        const result = compareNullableNumber(a.apy, b.apy);

        // The null sentinel is direction-independent; only real values flip.
        return a.apy === null || b.apy === null ? result : sign * result;
      }
    }
  };

  return [...rows].sort(compare);
}

export function isSortColumn(value: string): value is PositionSortColumn {
  return (
    value === 'staked' ||
    value === 'sharePercent' ||
    value === 'status' ||
    value === 'apy' ||
    value === 'activeValidatorCount'
  );
}
