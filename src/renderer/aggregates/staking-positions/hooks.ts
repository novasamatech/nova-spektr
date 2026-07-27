import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';

import { stakingPositions } from './model';

/**
 * Every staking position of the selected wallet, across all staking chains,
 * plus the totals the dashboard KPI cards show.
 */
export const useStakingPositions = () => {
  return useUnit({
    positions: stakingPositions.$positions,
    summary: stakingPositions.$summary,
    pending: stakingPositions.$pending,
  });
};

export const usePosition = (accountId: AccountId | null, chainId: ChainId | null): StakingPosition | null => {
  const positions = useUnit(stakingPositions.$positions);

  return useMemo(() => {
    if (!accountId || !chainId) return null;

    return positions.find(position => position.accountId === accountId && position.chainId === chainId) ?? null;
  }, [positions, accountId, chainId]);
};

/** Minimum bond required to nominate on the chain, `null` until it is read. */
export const useMinNominatorBond = (chainId: ChainId | null): string | null => {
  const minNominatorBond = useUnit(stakingPositions.$minNominatorBond);

  return chainId ? (minNominatorBond[chainId] ?? null) : null;
};
