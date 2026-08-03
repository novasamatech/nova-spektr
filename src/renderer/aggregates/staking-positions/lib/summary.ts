import { BN } from '@polkadot/util';

import { type ChainId } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';

/** Totals of a single staking chain. Planck amounts are in that chain's asset. */
export type StakingChainSummary = {
  chainId: ChainId;
  /** Sum of `stake.total` — bonded plus everything still unbonding. */
  totalStaked: string;
  redeemable: string;
  totalUnbonding: string;
  /** Distinct validators actively backing any position of this chain. */
  activeValidatorCount: number;
  positionCount: number;
  /** Positions with status `active` — the ones actually earning. */
  earningPositionCount: number;
};

export type StakingSummary = {
  /** Chains that hold at least one position, in staking-chain order. */
  chains: StakingChainSummary[];
  byChain: Record<ChainId, StakingChainSummary>;
  /**
   * Distinct active validators across every chain. A validator account is
   * counted per chain: the same key on Polkadot and Kusama is two validators.
   */
  activeValidatorCount: number;
  positionCount: number;
  earningPositionCount: number;
};

function addPlanck(a: string, b: string): string {
  return new BN(a).add(new BN(b)).toString();
}

function createChainSummary(chainId: ChainId): StakingChainSummary {
  return {
    chainId,
    totalStaked: '0',
    redeemable: '0',
    totalUnbonding: '0',
    activeValidatorCount: 0,
    positionCount: 0,
    earningPositionCount: 0,
  };
}

/**
 * The totals of an arbitrary set of positions — what `$summary` runs over the
 * whole selection, exported so a consumer narrowing that selection further (the
 * dashboard's KPI row follows its own account picker) gets the _same_ answer
 * instead of a second implementation of these rules.
 *
 * Planck is summed **per chain**, never across assets, and active validators
 * are counted **per chain** as well: the same validator key elected on Polkadot
 * and on Kusama is two validators, so the overall figure is the sum of the
 * per-chain distinct sets rather than a global set of keys.
 */
export function summarizePositions(positions: StakingPosition[]): StakingSummary {
  const byChain: Record<ChainId, StakingChainSummary> = {};
  const chains: StakingChainSummary[] = [];
  const validatorsByChain = new Map<ChainId, Set<AccountId>>();

  for (const position of positions) {
    const { chainId } = position;

    let summary = byChain[chainId];
    if (nullable(summary)) {
      summary = createChainSummary(chainId);
      byChain[chainId] = summary;
      chains.push(summary);
      validatorsByChain.set(chainId, new Set());
    }

    summary.totalStaked = addPlanck(summary.totalStaked, position.stake.total);
    summary.redeemable = addPlanck(summary.redeemable, position.redeemable);
    summary.totalUnbonding = addPlanck(summary.totalUnbonding, position.totalUnbonding);
    summary.positionCount += 1;
    if (position.status === 'active') {
      summary.earningPositionCount += 1;
    }

    const chainValidators = validatorsByChain.get(chainId);
    for (const validator of position.activeValidators) {
      chainValidators?.add(validator);
    }
  }

  let activeValidatorCount = 0;
  let earningPositionCount = 0;

  for (const summary of chains) {
    summary.activeValidatorCount = validatorsByChain.get(summary.chainId)?.size ?? 0;
    activeValidatorCount += summary.activeValidatorCount;
    earningPositionCount += summary.earningPositionCount;
  }

  return {
    chains,
    byChain,
    activeValidatorCount,
    positionCount: positions.length,
    earningPositionCount,
  };
}
