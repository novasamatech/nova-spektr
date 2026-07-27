import { default as BigNumber } from 'bignumber.js';

import { type ChainId } from '@/shared/core';
import { type StakingPosition } from '@/domains/staking';

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
