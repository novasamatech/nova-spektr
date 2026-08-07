import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Address, type ChainId } from '@/shared/core';
import { getRelaychainAsset, nullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { useStakingPositions } from '@/aggregates/staking-positions';
import { type PositionRole, derivePositionRole } from '@/features/dashboard-staking-positions';
import { sumPlanck } from '../lib/amounts';
import { realisedApy } from '../lib/realised-apy';
import { type RewardWindow, isWindowReady, windowBounds, windowDays } from '../lib/reward-period';
import { filterPositionsByAccounts } from '../lib/summary';

import { useNetworkApys } from './useNetworkApys';
import { useRawRewardPayouts } from './useRawRewardPayouts';

export type AccountRewardRow = {
  /** `${chainId}-${accountId}`. */
  id: string;
  accountId: AccountId;
  chainId: ChainId;
  networkName: string;
  chainName: string;
  address: Address;
  role: PositionRole;
  symbol: string;
  precision: number;
  /** Bonded ledger total, planck. */
  totalStaked: string;
  /** Payouts the indexer recorded inside the window, planck. */
  rewards: string;
  /** Annualised realised yield in percent, `null` when it cannot be stated. */
  apy: number | null;
  /** Current network reward rate in percent, as a benchmark. */
  networkApy: number | null;
};

export type AccountRewardRowsResult = {
  rows: AccountRewardRow[];
  /** Days the window spans — what the annualisation divides by. */
  days: number | null;
  /** A custom range with only one end picked: nothing to report yet. */
  ready: boolean;
};

/**
 * One row per (account × chain): what it has staked, what it earned inside the
 * window, and what that is worth annualised — beside the network's own rate.
 *
 * Rewards come from the indexer's raw payout rows, which are **received**
 * amounts with a timestamp, so a date range can be applied to them exactly. The
 * validator drill-down's "earned" figure is a different fact — accrued by era
 * replay — and the two are deliberately not mixed.
 */
export const useAccountRewardRows = (accountIds: string[], window: RewardWindow): AccountRewardRowsResult => {
  const { positions } = useStakingPositions();
  const chains = useUnit(networkModel.$chains);

  const scoped = useMemo(() => filterPositionsByAccounts(positions, accountIds), [positions, accountIds]);

  const payoutRequests = useMemo(() => {
    const byChain = new Map<ChainId, AccountId[]>();
    for (const position of scoped) {
      const accounts = byChain.get(position.chainId) ?? [];
      if (!accounts.includes(position.accountId)) accounts.push(position.accountId);
      byChain.set(position.chainId, accounts);
    }

    return [...byChain.entries()].map(([chainId, ids]) => ({ chainId, accountIds: ids.sort() }));
  }, [scoped]);

  const rawPayouts = useRawRewardPayouts(payoutRequests);
  const chainIds = useMemo(() => payoutRequests.map((request) => request.chainId), [payoutRequests]);
  const networkApys = useNetworkApys(chainIds);

  const bounds = windowBounds(window);
  const days = windowDays(window);
  const ready = isWindowReady(window);

  const rewardsByKey = useMemo(() => {
    const byKey = new Map<string, string[]>();
    if (!ready) return byKey;

    for (const payout of rawPayouts) {
      if (bounds.from !== null && payout.timestamp < bounds.from) continue;
      if (bounds.to !== null && payout.timestamp > bounds.to) continue;

      // The indexer speaks addresses; a row is keyed by account id.
      const key = `${payout.chainId}-${toAccountId(payout.address)}`;
      byKey.set(key, [...(byKey.get(key) ?? []), payout.amount]);
    }

    return byKey;
  }, [rawPayouts, bounds.from, bounds.to, ready]);

  const rows = useMemo(() => {
    const result: AccountRewardRow[] = [];

    for (const position of scoped) {
      const chain = chains[position.chainId];
      if (nullable(chain)) continue;

      const asset = getRelaychainAsset(chain.assets);
      if (nullable(asset)) continue;

      const key = `${position.chainId}-${position.accountId}`;
      const rewards = sumPlanck(rewardsByKey.get(key) ?? []);
      const parent = chain.parentId ? chains[chain.parentId] : undefined;

      result.push({
        id: key,
        accountId: position.accountId,
        chainId: position.chainId,
        networkName: parent?.name ?? chain.name,
        chainName: chain.name,
        address: toAddress(position.accountId, { prefix: chain.addressPrefix }),
        role: derivePositionRole(position),
        symbol: asset.symbol,
        precision: asset.precision,
        totalStaked: position.stake.active,
        rewards,
        apy: ready ? realisedApy(rewards, position.stake.active, days) : null,
        networkApy: networkApys[position.chainId] ?? null,
      });
    }

    // Biggest earner first — the row people open the table to find.
    return result.sort((a, b) => Number(b.rewards) - Number(a.rewards));
  }, [scoped, chains, rewardsByKey, networkApys, days, ready]);

  return { rows, days, ready };
};
