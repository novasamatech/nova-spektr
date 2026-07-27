import { BN } from '@polkadot/util';

import { type ExpiryUrgency } from './types';

/**
 * Planck amounts routinely exceed `Number.MAX_SAFE_INTEGER` (10 DOT is already
 * 1e11, and a validator's total stake is orders of magnitude past the limit),
 * so every comparison and every ratio below goes through `BN`. Parsing to
 * `Number` first silently collapses two different stakes into one and makes the
 * sort order arbitrary for the largest rows — exactly the rows that matter.
 */
export function comparePlanck(a: string, b: string): number {
  return new BN(a).cmp(new BN(b));
}

/** Descending by planck amount; ties keep the input order (stable sort). */
export function sortByStake<T>(rows: T[], getStake: (row: T) => string, direction: 'asc' | 'desc' = 'desc'): T[] {
  const sign = direction === 'desc' ? -1 : 1;

  return [...rows].sort((a, b) => sign * comparePlanck(getStake(a), getStake(b)));
}

const PERCENT_PRECISION = 4;

/**
 * `value` as a percentage of `total`, `0` when the total is zero.
 *
 * The division is done in planck with a fixed-point scale so a share stays
 * exact for amounts no `Number` can hold; only the final small percentage is
 * turned into a `Number`.
 */
export function calculateSharePercent(value: string, total: string): number {
  const totalBn = new BN(total);
  if (totalBn.isZero()) return 0;

  const scale = new BN(10).pow(new BN(PERCENT_PRECISION));
  const scaled = new BN(value).mul(scale).muln(100).div(totalBn);

  return scaled.toNumber() / 10 ** PERCENT_PRECISION;
}

/**
 * Mean APY of a validator set, ignoring validators the chain reports no APY
 * for. `null` when none of them carries one — counting those as zero would
 * understate the estimate rather than admit it is partial.
 */
export function averageApy(values: (number | null | undefined)[]): number | null {
  const known = values.filter((value): value is number => typeof value === 'number');

  if (known.length === 0) return null;

  return known.reduce((sum, apy) => sum + apy, 0) / known.length;
}

export const EXPIRY_CRITICAL_DAYS = 14;
export const EXPIRY_WARNING_DAYS = 30;

/**
 * How urgent an unclaimed payout is, by the days left before the oldest era
 * falls out of the runtime history and the reward is lost for good.
 */
export function getExpiryUrgency(daysLeft: number): ExpiryUrgency {
  if (daysLeft < EXPIRY_CRITICAL_DAYS) return 'critical';
  if (daysLeft <= EXPIRY_WARNING_DAYS) return 'warning';

  return 'safe';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ExpiryParams = {
  /** Oldest era carrying an unclaimed payout. */
  oldestEra: number;
  activeEra: number;
  /**
   * Eras the runtime keeps — the payout is unclaimable past `oldestEra +
   * historyDepth`.
   */
  historyDepth: number;
  eraDurationMs: number;
};

/**
 * Days until the oldest unclaimed payout expires. `null` when any input is
 * missing — an expiry chip that guesses is worse than no chip.
 */
export function calculateExpiryDays({
  oldestEra,
  activeEra,
  historyDepth,
  eraDurationMs,
}: ExpiryParams): number | null {
  if (eraDurationMs <= 0 || historyDepth <= 0) return null;

  const erasLeft = oldestEra + historyDepth - activeEra;
  if (erasLeft <= 0) return 0;

  return (erasLeft * eraDurationMs) / MS_PER_DAY;
}
