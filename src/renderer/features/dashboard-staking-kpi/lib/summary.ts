import { default as BigNumber } from 'bignumber.js';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';
import { type StakingChainSummary, type StakingSummary } from '@/aggregates/staking-positions';

/**
 * The aggregate is scoped to the selected wallet; the KPI row additionally
 * follows the dashboard's own account picker, so positions of accounts the user
 * unticked must not show up in the totals.
 */
export function filterPositionsByAccounts(positions: StakingPosition[], accountIds: string[]): StakingPosition[] {
  const allowed = new Set(accountIds);

  return positions.filter((position) => allowed.has(position.accountId));
}

function addPlanck(a: string, b: string): string {
  return new BigNumber(a).plus(b).toFixed(0);
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
 * The aggregate's summary over an arbitrary subset of its positions. Mirrors
 * `aggregates/staking-positions` exactly — planck per chain, never summed
 * across assets, and active validators counted **per chain** so the same key
 * elected on two networks counts twice.
 */
export function summarizePositions(positions: StakingPosition[]): StakingSummary {
  const byChain: Record<ChainId, StakingChainSummary> = {};
  const chains: StakingChainSummary[] = [];
  const validatorsByChain = new Map<ChainId, Set<AccountId>>();

  for (const position of positions) {
    const { chainId } = position;

    let summary = byChain[chainId];
    if (!summary) {
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

/** Positions that hold something withdrawable right now. */
export function withdrawablePositions(positions: StakingPosition[]): StakingPosition[] {
  return positions.filter((position) => new BigNumber(position.redeemable).gt(0));
}
