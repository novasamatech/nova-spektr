import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import { type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';

import { type EraThreshold } from './types';

export const eraThresholdsService = {
  getEraThreshold,
};

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
