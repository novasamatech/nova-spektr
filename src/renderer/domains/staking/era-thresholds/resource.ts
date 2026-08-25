import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { createQueryResource } from '@/shared/query';

import { eraThresholdsService } from './service';
import { type EraThreshold, type EraThresholdWindow } from './types';

export type EraThresholdResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  era: EraIndex;
};

function eraKey(chainId: ChainId, era: EraIndex): string {
  return `${chainId}_${era}`;
}

/**
 * Per-era cache, kept for the whole session: a closed era's exposures are
 * immutable, and the active era's are fixed at election — a threshold read once
 * never changes. `null` (era outside history) lands in the store as well, but
 * the request cache treats `null` as a miss, so such an era is read again
 * whenever the window re-runs — once per era advance, one cheap empty read.
 */
const $eraThresholdCache = createStore<Record<string, EraThreshold | null>>({});

const eraThresholdResource = createQueryResource<EraThresholdResourceParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('eraThreshold')
  .request<EraThreshold | null>(({ api, era }) => {
    return eraThresholdsService.getEraThreshold(api, era);
  })
  // One overview walk per era — a rate-limited response must not blank the
  // whole widget for the session.
  .retry({ count: 3, delay: 1000 })
  .cache({
    store: $eraThresholdCache,
    map: (state, threshold, { chainId, era }) => ({ ...state, [eraKey(chainId, era)]: threshold }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();

export type EraThresholdsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  /** The chain's active era — the window ends here. */
  era: EraIndex;
  /** How many completed eras to read before the active one. */
  depth: number;
};

type EraThresholdsCache = Record<ChainId, { era: EraIndex; depth: number } & EraThresholdWindow>;

const $eraThresholdsCache = createStore<EraThresholdsCache>({});

/**
 * A window with a hole in it is re-read on the next request after this long,
 * instead of being trusted for the session like a complete one — the eras that
 * did answer come straight from the per-era cache, so the retry only costs the
 * missing reads.
 */
const INCOMPLETE_WINDOW_STALE_MS = 60_000;

/**
 * Thresholds of the last `depth` completed eras plus the active one, oldest
 * first. Eras outside history — and eras whose read keeps failing after the
 * retries — are dropped from the series rather than reported as zero or allowed
 * to fail the whole window (see `collectEraThresholds`). Failed eras are kept
 * in `failedEras`, and such a window expires quickly.
 *
 * Eras are read one by one, sequentially: eight parallel prefix reads of ~600
 * entries each is exactly the burst public RPC nodes rate-limit. Each era goes
 * through the per-era resource, so when the era advances only the new era is
 * actually fetched — the rest answer from the immutable cache.
 */
export const eraThresholdsResource = createQueryResource<EraThresholdsResourceParams>({
  key: ({ chainId, era, depth }) => [chainId, String(era), String(depth)],
})
  .name('eraThresholds')
  .request<EraThresholdWindow>(({ chainId, api, era, depth }) => {
    return eraThresholdsService.collectEraThresholds(era, depth, index =>
      eraThresholdResource.fetch({ chainId, api, era: index }),
    );
  })
  .cache({
    store: $eraThresholdsCache,
    map: (state, window, { chainId, era, depth }) => ({ ...state, [chainId]: { era, depth, ...window } }),
    staleAfter: window => (window.failedEras.length > 0 ? INCOMPLETE_WINDOW_STALE_MS : Number.POSITIVE_INFINITY),
  })
  .build();
