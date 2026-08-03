import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';

/**
 * One validator the selection nominates, and how much of the selection stands
 * behind it.
 *
 * The question this answers is concentration: a subset of twenty accounts all
 * nominating the same five validators is exposed to those five, however evenly
 * the stake looks spread across the accounts themselves.
 */
export type NominationRow = {
  /** `chainId:validator` — a key is only unique within its chain. */
  key: string;
  validatorId: AccountId;
  chainId: ChainId;
  chainName: string;
  /** Selected accounts nominating this validator. */
  nominatorCount: number;
  /** Of those, the ones it actually backs in the active era. */
  activeCount: number;
  /** Which accounts, in the order the positions came in. */
  accountIds: AccountId[];
};

type ChainNames = Record<ChainId, string>;

/**
 * Rows are per **(chain, validator)**: the same key elected on two networks is
 * two validators, because it is two sets of nominations and two rewards.
 *
 * Sorted by how many accounts nominate the validator, then by how many it
 * actually backs — the top of the list is where concentration lives, which is
 * what the view exists to show.
 */
export function buildNominationRows(positions: StakingPosition[], chainNames: ChainNames): NominationRow[] {
  const byValidator = new Map<string, NominationRow>();

  for (const position of positions) {
    const active = new Set(position.activeValidators);

    for (const validatorId of position.nominations) {
      const key = `${position.chainId}:${validatorId}`;

      let row = byValidator.get(key);
      if (!row) {
        row = {
          key,
          validatorId,
          chainId: position.chainId,
          chainName: chainNames[position.chainId] ?? '',
          nominatorCount: 0,
          activeCount: 0,
          accountIds: [],
        };
        byValidator.set(key, row);
      }

      // A position is one account on one chain, so it can only be counted once
      // per validator — but a defensive check keeps a duplicated nomination
      // target from inflating the count.
      if (row.accountIds.includes(position.accountId)) continue;

      row.accountIds.push(position.accountId);
      row.nominatorCount += 1;
      if (active.has(validatorId)) {
        row.activeCount += 1;
      }
    }
  }

  return [...byValidator.values()].sort((a, b) => b.nominatorCount - a.nominatorCount || b.activeCount - a.activeCount);
}

/** Distinct validators the selection nominates, counted per chain. */
export function countNominatedValidators(rows: NominationRow[]): number {
  return rows.length;
}
