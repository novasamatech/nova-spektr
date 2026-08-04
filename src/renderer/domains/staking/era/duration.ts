import { type ApiPromise } from '@polkadot/api';

import { type Chain } from '@/shared/core';
import { getExpectedBlockTime } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { DEFAULT_ERA_DURATION_MS, FALLBACK_ERA_DURATION_MS } from '../constants';

/**
 * Either a full chain descriptor or just its id — validator APY is computed per
 * chain id alone, while the era anchor always has the whole chain at hand.
 */
export type EraDurationChain = Pick<Chain, 'chainId'> | Chain;

/** Chain values arrive as codecs; `String()` covers both BN and primitives. */
export function toChainNumber(value: unknown): number {
  const parsed = Number(String(value));

  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * `getExpectedBlockTime` reads chain-level overrides that only the full
 * descriptor carries, so callers holding a bare chain id skip that branch.
 */
function isFullChain(chain: EraDurationChain): chain is Chain {
  return 'nodes' in chain;
}

/** Session length of the timeline chain, measured in slots (blocks). */
export function getSessionDuration(timelineApi: ApiPromise | null | undefined): number {
  return toChainNumber(timelineApi?.consts['babe']?.['epochDuration']);
}

/**
 * Block time of the timeline chain — session math is counted in its slots, so
 * the chain override is only a fallback for runtimes without babe.
 */
export function getBlockTimeMs(timelineApi: ApiPromise | null | undefined, chain?: EraDurationChain): number {
  const expectedBlockTime = toChainNumber(timelineApi?.consts['babe']?.['expectedBlockTime']);
  if (expectedBlockTime > 0) return expectedBlockTime;

  if (!timelineApi || !chain || !isFullChain(chain)) return 0;

  return getExpectedBlockTime(timelineApi, chain).toNumber();
}

/**
 * Era length in milliseconds — the single source for every era-derived number:
 * APY annualisation, unbonding unlock estimates and reward expiry countdowns.
 *
 * Asset Hub is a parachain without a babe pallet, so the length is derived from
 * the timeline (relay) chain: `sessionsPerEra (staking chain) × epochDuration ×
 * blockTime (timeline)`. The relay block time (≈6s) is the right one here —
 * using the Asset Hub block time (≈12s) would double the era and halve APY.
 *
 * Never returns zero: when the timeline chain can't answer (no relay connection
 * — the timeline api then collapses onto Asset Hub itself) the per-chain
 * fallback keeps all consumers on the same era length, instead of one screen
 * showing a 24h era while another drops its countdown entirely.
 */
export function getEraDurationMs(
  api: ApiPromise,
  timelineApi: ApiPromise | null | undefined,
  chain?: EraDurationChain,
): number {
  try {
    const sessionsPerEra = stakingPallet.consts.sessionsPerEra(api);
    const sessionDuration = getSessionDuration(timelineApi);
    const blockTimeMs = getBlockTimeMs(timelineApi, chain);
    const eraDurationMs = sessionsPerEra * sessionDuration * blockTimeMs;

    if (eraDurationMs > 0) return eraDurationMs;
  } catch (error) {
    console.warn('Unable to derive era duration from the timeline chain', error);
  }

  return (chain ? FALLBACK_ERA_DURATION_MS[chain.chainId] : undefined) ?? DEFAULT_ERA_DURATION_MS;
}
