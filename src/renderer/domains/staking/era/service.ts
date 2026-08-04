import { type ApiPromise } from '@polkadot/api';

import { type Chain, type EraIndex } from '@/shared/core';
import { assert, nonNullable } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

import { getBlockTimeMs, getEraDurationMs, getSessionDuration, toChainNumber } from './duration';

export type EraAnchor = {
  /** Unix timestamp (ms) of the moment the era became active. */
  eraStartMs: number;
  /** Full era length in ms — countdowns are derived from the anchor. */
  eraDurationMs: number;
};

/**
 * Everything needed to translate the session cursor of the timeline chain into
 * era progress.
 */
type EraTimeline = {
  activeEra: EraIndex;
  eraStartSession: number;
  sessionsPerEra: number;
  /** Session length measured in slots (blocks). */
  sessionDuration: number;
  blockTimeMs: number;
  currentSessionIndex: number;
  currentSlot: number;
  genesisSlot: number;
};

const activeEraSchema = pjsSchema.optional(stakingPallet.schema.stakingActiveEraInfo);

/**
 * Whether the timeline chain can answer the session/babe reads the era anchor
 * needs. Asset Hub carries neither pallet.
 */
function hasEraTimelinePallets(timelineApi: ApiPromise): boolean {
  return nonNullable(timelineApi.query['session']?.['currentIndex']) && nonNullable(timelineApi.query['babe']);
}

/**
 * `bondedEras` is public on staking-async runtimes and `pub(crate)` in classic
 * `pallet_staking` — fall back to `erasStartSessionIndex` when it's absent.
 */
async function resolveEraStartSession(api: ApiPromise, era: EraIndex): Promise<number | null> {
  const bondedEras = await stakingPallet.storage.bondedEras(api).catch(() => null);
  const bondedEra = bondedEras?.find(item => item.era === era);

  if (bondedEra) return bondedEra.session;

  return stakingPallet.storage.erasStartSessionIndex(api, era).catch(() => null);
}

async function getEraTimeline(api: ApiPromise, timelineApi: ApiPromise, chain?: Chain): Promise<EraTimeline | null> {
  const activeEra = await stakingPallet.storage.activeEra(api);
  if (!activeEra) return null;

  const eraStartSession = await resolveEraStartSession(api, activeEra.index);
  if (eraStartSession === null) return null;

  const sessionsPerEra = stakingPallet.consts.sessionsPerEra(api);
  const sessionDuration = getSessionDuration(timelineApi);
  const blockTimeMs = getBlockTimeMs(timelineApi, chain);

  if (sessionsPerEra <= 0 || sessionDuration <= 0 || blockTimeMs <= 0) return null;

  // Session and babe live on the relay chain. When no relay api is connected the
  // timeline api falls back to the staking chain itself, where neither pallet
  // exists - a missing anchor is an expected outcome there, not an error worth
  // throwing once per era per chain.
  if (!hasEraTimelinePallets(timelineApi)) return null;

  const [currentSessionIndex, currentSlot, genesisSlot] = await Promise.all([
    timelineApi.query.session.currentIndex(),
    timelineApi.query.babe.currentSlot(),
    timelineApi.query.babe.genesisSlot(),
  ]);

  return {
    activeEra: activeEra.index,
    eraStartSession,
    sessionsPerEra,
    sessionDuration,
    blockTimeMs,
    currentSessionIndex: toChainNumber(currentSessionIndex),
    currentSlot: toChainNumber(currentSlot),
    genesisSlot: toChainNumber(genesisSlot),
  };
}

/**
 * How many slots of the active era have already passed.
 */
function getEraProgressSlots(timeline: EraTimeline): number {
  const sessionStartSlot = timeline.currentSessionIndex * timeline.sessionDuration + timeline.genesisSlot;
  const sessionProgress = timeline.currentSlot - sessionStartSlot;
  const eraProgress =
    (timeline.currentSessionIndex - timeline.eraStartSession) * timeline.sessionDuration + sessionProgress;
  const eraLength = timeline.sessionsPerEra * timeline.sessionDuration;

  if (eraProgress > 0 && eraProgress > eraLength) {
    return eraProgress % eraLength;
  }

  return eraProgress;
}

function subscribeActiveEra(api: ApiPromise, callback: (era?: EraIndex) => void): Promise<() => void> {
  return api.query.staking.activeEra(data => {
    try {
      callback(activeEraSchema.parse(data)?.index);
    } catch (error) {
      console.warn(error);
      callback(undefined);
    }
  });
}

async function getActiveEra(api: ApiPromise): Promise<EraIndex | undefined> {
  const activeEra = await stakingPallet.storage.activeEra(api);

  return activeEra?.index;
}

/**
 * Stable anchor of the active era. Countdowns are derived on the client from
 * the anchor, so it never needs polling.
 *
 * Returns `null` when the chain doesn't expose enough data instead of throwing.
 */
async function getEraStart(api: ApiPromise, timelineApi: ApiPromise, chain: Chain): Promise<EraAnchor | null> {
  try {
    const activeEra = await stakingPallet.storage.activeEra(api);
    if (!activeEra) return null;

    // The duration falls back to a per-chain constant, so a missing relay
    // connection can no longer invalidate an authoritative start timestamp -
    // reading `activeEra` first is what keeps that path reachable on Asset Hub.
    const eraDurationMs = getEraDurationMs(api, timelineApi, chain);

    // `ActiveEraInfo.start` is the exact activation timestamp when the runtime
    // exposes it — no session math needed.
    if (activeEra.start) {
      return { eraStartMs: activeEra.start.toNumber(), eraDurationMs };
    }

    // Without the timestamp the anchor has to be reconstructed from the session
    // cursor of the timeline chain, which the fallback duration can't stand in for.
    const timeline = await getEraTimeline(api, timelineApi, chain);
    if (!timeline) return null;

    return {
      eraStartMs: Date.now() - getEraProgressSlots(timeline) * timeline.blockTimeMs,
      eraDurationMs,
    };
  } catch (error) {
    console.warn(error);

    return null;
  }
}

async function getTimeToEra(api: ApiPromise, timelineApi: ApiPromise, destinationEra?: EraIndex): Promise<number> {
  if (!destinationEra) return 0;

  const timeline = await getEraTimeline(api, timelineApi);
  assert(timeline, 'era timeline is not available');

  const eraProgress = getEraProgressSlots(timeline);
  const leftEras = destinationEra - timeline.activeEra - 1;
  const blocksLeftForEras = leftEras * timeline.sessionsPerEra * timeline.sessionDuration;

  const buffer = 1;

  return ((eraProgress + blocksLeftForEras + buffer) * timeline.blockTimeMs) / 1000;
}

export const eraService = {
  subscribeActiveEra,
  getActiveEra,
  getTimeToEra,
  getEraStart,
  /** Single source of era length for the whole app — see `./duration`. */
  getEraDurationMs,
  resolveEraStartSession,
};
