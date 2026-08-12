import { default as BigNumber } from 'bignumber.js';

import { type ChainId } from '@/shared/core';
import { type NetworkAvgRate, type StakingPosition } from '@/domains/staking';

/**
 * One chain's contribution to the blended APY: the network APY it pays and the
 * fiat weight of the stake that actually earns it.
 */
export type ApyWeight = {
  chainId: ChainId;
  /** Network APY in percent, `null` when the chain has not reported one. */
  apy: number | null;
  /** Fiat value of the earning stake on that chain. */
  weight: string;
};

/**
 * Only `active` positions earn. A bonded-but-not-nominating ledger, or one
 * whose nominations were not elected, contributes nothing and must not drag the
 * headline APY down — it is an "estimated APY of what you are earning on", not
 * an average over everything bonded.
 */
export function isEarning(position: StakingPosition): boolean {
  return position.status === 'active';
}

export function earningPositions(positions: StakingPosition[]): StakingPosition[] {
  return positions.filter(isEarning);
}

/** Planck sum of the active (earning) stake per chain, earning positions only. */
export function earningStakeByChain(positions: StakingPosition[]): Record<ChainId, string> {
  const result: Record<ChainId, string> = {};

  for (const position of earningPositions(positions)) {
    const current = result[position.chainId] ?? '0';
    result[position.chainId] = new BigNumber(current).plus(position.stake.active).toFixed(0);
  }

  return result;
}

/**
 * Stake-weighted blend of the per-chain APYs. Weights are fiat, because planck
 * amounts of different assets cannot be compared. Chains with an unknown APY or
 * no earning stake are skipped entirely rather than counted as zero — a missing
 * APY reading must not halve the number the user sees.
 *
 * Returns `null` when nothing can be weighted at all.
 */
export function computeWeightedApy(entries: ApyWeight[]): number | null {
  let weighted = new BigNumber(0);
  let totalWeight = new BigNumber(0);

  for (const entry of entries) {
    if (entry.apy === null || !Number.isFinite(entry.apy)) continue;

    const weight = new BigNumber(entry.weight || '0');
    if (!weight.gt(0)) continue;

    weighted = weighted.plus(weight.times(entry.apy));
    totalWeight = totalWeight.plus(weight);
  }

  if (!totalWeight.gt(0)) return null;

  return weighted.div(totalWeight).toNumber();
}

/**
 * `NetworkAvgRate.ratePercent` travels as a string; the single parse rule for
 * every consumer — a malformed value must read as unknown, never render
 * "NaN%".
 */
export function parseRatePercent(ratePercent: string): number | null {
  const rate = Number(ratePercent);

  return Number.isFinite(rate) ? rate : null;
}

/** One chain's contribution to the blended network benchmark. */
export type NetworkAvgWeight = {
  chainId: ChainId;
  /** The chain's trailing-window rate, `null` when it has not reported one. */
  rate: Pick<NetworkAvgRate, 'ratePercent' | 'days'> | null;
  /** Fiat value of the earning stake on that chain. */
  weight: string;
};

/**
 * Blended benchmark. `coverage` is the share (0..1) of the positive weight that
 * the contributing chains actually cover — the consumer must not present the
 * blend as "the network average" when a chain holding most of the stake could
 * not be measured (e.g. a transient RPC failure on Polkadot AH would otherwise
 * leave a Kusama-only "network avg 15%" beside a mostly-Polkadot headline).
 */
export type NetworkAvgBlend = {
  rate: number;
  days: number;
  coverage: number;
};

/**
 * Minimum share of the earning stake's weight the benchmark must cover to be
 * presented as "the network average". Full coverage: with only 2-3 staking
 * chains, a benchmark that could not measure one of them describes a different
 * portfolio than the headline next to it.
 */
export const NETWORK_AVG_MIN_COVERAGE = 1;

/**
 * Stake-weighted blend of the per-chain network average rates — the same
 * skip-not-zero weighting as `computeWeightedApy`, carrying the window length
 * along: the label shows the longest window among the contributing chains — the
 * blend legitimately includes that much history for at least one component, and
 * the per-chain breakdown shows each chain's exact window; "shortest" would
 * understate every other component. A real tradeoff, revisit if it confuses.
 */
export function blendNetworkAvgRate(entries: NetworkAvgWeight[]): NetworkAvgBlend | null {
  let weighted = new BigNumber(0);
  let totalWeight = new BigNumber(0);
  let totalPositiveWeight = new BigNumber(0);
  let days = 0;

  for (const entry of entries) {
    const weight = new BigNumber(entry.weight || '0');
    if (weight.gt(0)) totalPositiveWeight = totalPositiveWeight.plus(weight);

    if (entry.rate === null) continue;

    const rate = parseRatePercent(entry.rate.ratePercent);
    if (rate === null) continue;

    if (!weight.gt(0)) continue;

    weighted = weighted.plus(weight.times(rate));
    totalWeight = totalWeight.plus(weight);
    days = Math.max(days, entry.rate.days);
  }

  if (!totalWeight.gt(0)) return null;

  return {
    rate: weighted.div(totalWeight).toNumber(),
    days,
    coverage: totalWeight.div(totalPositiveWeight).toNumber(),
  };
}
