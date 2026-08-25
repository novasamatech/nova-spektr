import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingPosition } from '@/domains/staking';

import { stakingPositions } from './model';

/**
 * Hands the dashboard's account selection to the aggregate for as long as the
 * caller is mounted.
 *
 * The aggregate answers for exactly the ids it is given - never for the wallet
 * selected in wallet management. Every widget that reads `$positions` calls
 * this with the same dashboard selection; the aggregate counts its consumers
 * and drops the selection (and every subscription it costs) only when the last
 * one unmounts, so hiding one widget never blanks another that is still on
 * screen.
 */
export const useStakingAccountSelection = (accountIds: string[]) => {
  const { selectAccountIds, retainSelection, releaseSelection } = useUnit({
    selectAccountIds: stakingPositions.selectAccountIds,
    retainSelection: stakingPositions.retainSelection,
    releaseSelection: stakingPositions.releaseSelection,
  });

  const selectedAccountIds = useMemo(() => accountIds.map(id => toAccountId(id)), [accountIds]);

  useEffect(() => {
    selectAccountIds(selectedAccountIds);
  }, [selectedAccountIds, selectAccountIds]);

  useEffect(() => {
    retainSelection();

    return () => {
      releaseSelection();
    };
  }, [retainSelection, releaseSelection]);
};

/**
 * Every staking position of the dashboard's account selection, across all
 * staking chains, plus the totals the dashboard KPI cards show.
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
