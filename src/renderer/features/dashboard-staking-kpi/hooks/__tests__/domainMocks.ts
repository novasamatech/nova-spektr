import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type EraScopedCache, type NetworkAvgRate } from '@/domains/staking';

/**
 * Writable stand-ins for the read-only resource caches the KPI hooks read, so a
 * test can seed them through `fork({ values })`. Only type imports above, so
 * this module stays outside the mocked modules' runtime graph.
 */
export const $apyCache = createStore<EraScopedCache<string | null>>({});

export const $avgRateCache = createStore<EraScopedCache<NetworkAvgRate | null>>({});

export const $eraCache = createStore<Record<ChainId, EraIndex>>({});
