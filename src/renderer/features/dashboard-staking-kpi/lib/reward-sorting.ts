import { default as BigNumber } from 'bignumber.js';

import { type TableSort } from '@/shared/ui-kit';

import { type ValidatorRewardRow } from './validator-rewards';

/** Columns of the rewards modal's validator table the header can sort by. */
export type RewardSortColumn = 'validatorId' | 'nominators' | 'accrued' | 'unclaimed';

/**
 * Unclaimed leads by default — it is the only column the user can act on, and
 * the claim-order rationale of `buildValidatorRewardRows` carries over.
 */
export const DEFAULT_REWARD_SORT = { column: 'unclaimed', direction: 'desc' } as const satisfies TableSort;

/**
 * The row's planck figures come from different chains, so the amount columns
 * sort by the fiat the modal already resolved per row.
 */
type SortableRow = ValidatorRewardRow & { accruedFiat: string };

export function isRewardSortColumn(value: string): value is RewardSortColumn {
  return value === 'validatorId' || value === 'nominators' || value === 'accrued' || value === 'unclaimed';
}

function compareFiat(a: string, b: string): number {
  return new BigNumber(a).comparedTo(b) ?? 0;
}

/**
 * `names` maps row key → the validator name **on screen** (resolved identity or
 * the SS58 address the cell falls back to), so the name column sorts by what
 * the user reads, not by raw account ids.
 */
export function sortRewardRows<T extends SortableRow>(
  rows: T[],
  column: RewardSortColumn,
  direction: 'asc' | 'desc',
  names: Record<string, string>,
): T[] {
  const sign = direction === 'desc' ? -1 : 1;

  const compare = (a: T, b: T): number => {
    switch (column) {
      case 'validatorId': {
        const nameA = names[a.key] ?? '';
        const nameB = names[b.key] ?? '';

        return sign * nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      }
      case 'nominators':
        // Ties put our own validator first: "self" reads before "N accounts".
        return sign * (a.nominators.length - b.nominators.length) || Number(b.isSelf) - Number(a.isSelf);
      case 'accrued':
        return sign * compareFiat(a.accruedFiat, b.accruedFiat) || -compareFiat(a.unclaimedFiat, b.unclaimedFiat);
      case 'unclaimed':
        return sign * compareFiat(a.unclaimedFiat, b.unclaimedFiat) || -compareFiat(a.accruedFiat, b.accruedFiat);
    }
  };

  return [...rows].sort(compare);
}
