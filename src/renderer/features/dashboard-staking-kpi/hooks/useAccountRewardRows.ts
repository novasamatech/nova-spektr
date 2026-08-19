import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Address, type Chain, type ChainId, type Wallet } from '@/shared/core';
import { getRelaychainAsset, nullable, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel, walletUtils } from '@/entities/wallet';
import { useStakingPositions } from '@/aggregates/staking-positions';
import { type PositionRole, derivePositionRole } from '@/features/dashboard-staking-positions';
import { sumPlanck } from '../lib/amounts';
import { realisedApy } from '../lib/realised-apy';
import { type RewardWindow, isWindowReady, windowBounds, windowDays } from '../lib/reward-period';
import { filterPositionsByAccounts } from '../lib/summary';

import { useNetworkApys } from './useNetworkApys';
import { useRawPayoutsSince, useRawRewardPayouts } from './useRawRewardPayouts';

export type AccountRewardRow = {
  /** `${chainId}-${accountId}`. */
  id: string;
  accountId: AccountId;
  chainId: ChainId;
  networkName: string;
  chainName: string;
  /** The chain itself — the account cell resolves names against it. */
  chain: Chain;
  address: Address;
  /** Wallet the account belongs to, `null` for a foreign / contact address. */
  wallet: Wallet | null;
  role: PositionRole;
  symbol: string;
  precision: number;
  /**
   * Ledger total — bonded plus everything still unbonding, planck. The same
   * figure the positions table's Staked column prints, so the two tables cannot
   * disagree about one row.
   */
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
  /**
   * Whether the payout history reaches back far enough to answer the window.
   * `false` for a custom range that starts before the fetched year — the rows
   * are still listed, but their APY is `null` rather than a confident `0.00%`.
   */
  covered: boolean;
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
  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);

  const walletByAccountId = useMemo(() => {
    const map = new Map<string, Wallet>();

    for (const account of allAccounts) {
      if (map.has(account.accountId)) continue;

      const wallet = walletUtils.getWalletById(wallets, account.walletId);
      if (wallet) map.set(account.accountId, wallet);
    }

    return map;
  }, [allAccounts, wallets]);

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
  const payoutsSince = useRawPayoutsSince();
  const chainIds = useMemo(() => payoutRequests.map((request) => request.chainId), [payoutRequests]);
  const networkApys = useNetworkApys(chainIds);

  const bounds = windowBounds(window);
  const days = windowDays(window);
  const ready = isWindowReady(window);

  /**
   * Whether the indexer rows actually span the requested window.
   *
   * The payout history is fetched from the first of the month twelve months
   * back, but the Custom picker accepts any past date. A range that starts
   * before that has no rows to sum, and reporting the resulting `0` as a
   * realised APY would state a confident `0.00%` about a period nobody looked
   * at — the same "not read is not zero" rule the rest of this feature
   * follows.
   */
  const covered = ready && (bounds.from === null || bounds.from >= payoutsSince);

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
        chain,
        address: toAddress(position.accountId, { prefix: chain.addressPrefix }),
        wallet: walletByAccountId.get(position.accountId) ?? null,
        role: derivePositionRole(position),
        symbol: asset.symbol,
        precision: asset.precision,
        totalStaked: position.stake.total,
        rewards,
        apy: covered ? realisedApy(rewards, position.stake.total, days) : null,
        networkApy: networkApys[position.chainId] ?? null,
      });
    }

    // Biggest earner first — the row people open the table to find.
    return result.sort((a, b) => Number(b.rewards) - Number(a.rewards));
  }, [scoped, chains, walletByAccountId, rewardsByKey, networkApys, days, covered]);

  return { rows, days, ready, covered };
};
