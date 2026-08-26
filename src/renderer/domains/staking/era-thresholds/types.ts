import { type EraIndex } from '@/shared/core';

/**
 * The era's entry threshold: the smallest total backing (own + nominator stake)
 * among the validators the election actually seated. A validator whose backing
 * is below it did not enter the active set that era.
 *
 * Not to be confused with `staking.minimumActiveStake`, which is the smallest
 * stake among electing nominators — a nominator-side metric.
 */
export type EraThreshold = {
  era: EraIndex;
  /** Smallest total backing among the era's elected validators, in planck. */
  minStake: string;
  /** How many validators the era elected. */
  validatorCount: number;
};

/** A window of era thresholds, oldest first, plus the eras it could not read. */
export type EraThresholdWindow = {
  thresholds: EraThreshold[];
  /** Eras whose read failed after the retries — the series has a hole there. */
  failedEras: EraIndex[];
};
