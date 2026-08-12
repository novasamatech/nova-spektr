import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import { type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';

import { type EraThreshold } from './types';

export const eraThresholdsService = {
  getEraThreshold,
  collectEraThresholds,
};

/**
 * Thresholds of the last `depth` completed eras plus the active one, oldest
 * first, fetched one era at a time through `fetchEra`.
 *
 * A flaky era read must not blank the whole widget: an era whose fetch throws
 * is dropped from the series instead of failing the window. Only a window with
 * no answers at all propagates the failure — returning `[]` there would cache
 * the claim "no era history" that nobody established.
 */
async function collectEraThresholds(
  era: EraIndex,
  depth: number,
  fetchEra: (era: EraIndex) => Promise<EraThreshold | null>,
): Promise<EraThreshold[]> {
  const thresholds: EraThreshold[] = [];
  let failure: unknown = null;

  for (let index = Math.max(era - depth, 0); index <= era; index += 1) {
    try {
      const threshold = await fetchEra(index);
      if (threshold) {
        thresholds.push(threshold);
      }
    } catch (error) {
      failure = error;
    }
  }

  if (thresholds.length === 0 && failure !== null) {
    throw failure;
  }

  return thresholds;
}

/**
 * Entry threshold of a single era, read from the era's exposure overviews.
 *
 * `null` when the era has no overview entries — outside `historyDepth`, or a
 * chain whose history has not been written yet. Never zero: a zero threshold is
 * a claim about the network nobody established.
 */
async function getEraThreshold(api: ApiPromise, era: EraIndex): Promise<EraThreshold | null> {
  const entries = await stakingPallet.storage.erasStakersOverview(api, era);
  if (entries.length === 0) return null;

  let min: BN | null = null;
  for (const { overview } of entries) {
    if (min === null || overview.total.lt(min)) {
      min = overview.total;
    }
  }
  if (min === null) return null;

  return { era, minStake: min.toString(), validatorCount: entries.length };
}
