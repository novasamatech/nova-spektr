import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type ChainId, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { getColorByPriceId } from '@/shared/ui/chart-constants';
import { type CurrencyItem } from '@/domains/price';
import { type StakingPosition } from '@/domains/staking';
import { walletModel } from '@/entities/wallet';
import { type StakingSummary, summarizePositions, useStakingPositions } from '@/aggregates/staking-positions';
import { getPositionAccess, useDraftPolicy, useSignerAccountIds } from '@/features/dashboard-staking-positions';
import { type Access } from '../lib/access';
import { type AssetAmount, sumFiat, sumPlanck } from '../lib/amounts';
import { type NetworkAvgBlend } from '../lib/apy';
import { daysUntilExpiry, erasUntilExpiry, oldestPayoutEra } from '../lib/expiry';
import { type UnbondingFooter, type UnclaimedFooter, getUnbondingFooter, getUnclaimedFooter } from '../lib/footer';
import { type NominationRow, buildNominationRows } from '../lib/nominations';
import { filterPositionsByAccounts, withdrawablePositions } from '../lib/summary';
import { type BreakdownRow, type ClaimRow, type PositionRow } from '../lib/types';

import { useApyKpi } from './useApyKpi';
import { useChainEras, useChainHistoryDepths, useEraDurations } from './useChainEras';
import { REWARDS_WINDOW_DAYS, useRewardsWindow, useRewardsWindowStart } from './useRewardsWindow';
import { useStakingChainAssets } from './useStakingChainAssets';
import { unclaimedKey, useUnclaimedPayoutsByPosition } from './useUnclaimedPayouts';

export type StakingKpiData = {
  positions: StakingPosition[];
  summary: StakingSummary;
  pending: boolean;
  currency: CurrencyItem | null;
  fiatFlag: boolean | null;

  /** Total staked. */
  totalStakedFiat: string;
  stakedAmounts: AssetAmount[];
  unbondingFooter: UnbondingFooter | null;

  /** Estimated APY. */
  weightedApy: number | null;
  earningPositionCount: number;
  /**
   * Blended trailing-window network benchmark; `null` while unknown. The UI
   * must check `coverage` before presenting it as "the network average".
   */
  networkAvg: NetworkAvgBlend | null;

  /** Nominated validators. */
  activeValidatorCount: number;
  positionCount: number;
  /** One row per validator the selection nominates, most-nominated first. */
  nominationRows: NominationRow[];

  /** Rewards. */
  rewardsWindowDays: number;
  rewardsFiat: string;
  rewardAmounts: AssetAmount[];
  unclaimedFooter: UnclaimedFooter | null;

  /** Drill-down rows. */
  breakdownRows: BreakdownRow[];
  claimRows: ClaimRow[];
  positionRows: PositionRow[];

  walletByAccount: Record<string, Wallet | null>;
};

const EMPTY_ACCOUNT_IDS: AccountId[] = [];

/**
 * Everything the four KPI cards and their drill-downs render, assembled once so
 * the cards and the modals can never disagree about a number.
 */
export const useStakingKpi = (accountIds: string[]): StakingKpiData => {
  const { positions: allPositions, pending } = useStakingPositions();
  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$availableAccounts);
  const { byChain: assets, chains, currency, fiatFlag, toFiat } = useStakingChainAssets();
  const eras = useChainEras();
  const eraDurations = useEraDurations();
  const historyDepths = useChainHistoryDepths();

  // The aggregate answers for the selected wallet; the dashboard's own account
  // picker scopes it further.
  const positions = useMemo(() => filterPositionsByAccounts(allPositions, accountIds), [allPositions, accountIds]);
  const summary = useMemo(() => summarizePositions(positions), [positions]);

  const chainIds = useMemo(() => chains.map((entry) => entry.chainId), [chains]);
  const stakingAccountIds = useMemo(
    () => (positions.length === 0 ? EMPTY_ACCOUNT_IDS : [...new Set(positions.map((p) => p.accountId))].sort()),
    [positions],
  );

  const { weightedApy, networkAvg, apyByChain, avgRateByChain } = useApyKpi(positions, chainIds, toFiat);
  const rewardsSince = useRewardsWindowStart();
  const { byChain: rewardsByChain } = useRewardsWindow(chainIds, stakingAccountIds, rewardsSince);
  const unclaimed = useUnclaimedPayoutsByPosition(positions);

  const accountByAccountId = useMemo(() => {
    const map = new Map<string, (typeof accounts)[number]>();
    for (const account of accounts) {
      if (!map.has(account.accountId)) {
        map.set(account.accountId, account);
      }
    }

    return map;
  }, [accounts]);

  const walletByAccount = useMemo(() => {
    const result: Record<string, Wallet | null> = {};
    for (const [accountId, account] of accountByAccountId) {
      result[accountId] = wallets.find((wallet) => wallet.id === account.walletId) ?? null;
    }

    return result;
  }, [accountByAccountId, wallets]);

  // Built once for the whole selection rather than inside `getPositionAccess`:
  // the loops below run per row, and both are the same for all of them.
  const signerAccountIds = useSignerAccountIds();
  const positionChainIds = useMemo(() => [...new Set(positions.map((p) => p.chainId))], [positions]);
  const draftPolicy = useDraftPolicy(positionChainIds);

  /**
   * The verdict for one row, which is a position — an account _on a chain_.
   *
   * Not cached per account: a proxy edge exists on one network and not on
   * another, so the same address can be a draft source on Polkadot and a dead
   * end on Kusama. An account absent from the wallet map is an address-book
   * entry, and `getPositionAccess(null, …)` is exactly the verdict the
   * positions table gives it — the two surfaces cannot disagree.
   */
  const accessFor = useCallback(
    (accountId: AccountId, chainId: ChainId): Access =>
      getPositionAccess(
        accountByAccountId.get(accountId) ?? null,
        accountId,
        chainId,
        wallets,
        signerAccountIds,
        draftPolicy,
      ),
    [accountByAccountId, wallets, signerAccountIds, draftPolicy],
  );

  // --- Total staked -------------------------------------------------------

  const { totalStakedFiat, stakedAmounts, unbondingFooter } = useMemo(() => {
    const staked: AssetAmount[] = [];
    const unbonding: AssetAmount[] = [];
    const redeemable: AssetAmount[] = [];
    const fiatParts: string[] = [];

    for (const chainSummary of summary.chains) {
      const asset = assets[chainSummary.chainId];
      if (!asset) continue;

      const meta = { symbol: asset.symbol, precision: asset.precision };
      staked.push({ ...meta, amount: chainSummary.totalStaked });
      unbonding.push({ ...meta, amount: chainSummary.totalUnbonding });
      redeemable.push({ ...meta, amount: chainSummary.redeemable });
      fiatParts.push(toFiat(chainSummary.chainId, chainSummary.totalStaked));
    }

    return {
      totalStakedFiat: sumFiat(fiatParts),
      stakedAmounts: staked,
      unbondingFooter: getUnbondingFooter({
        unbonding,
        redeemable,
        withdrawableCount: withdrawablePositions(positions).length,
      }),
    };
  }, [summary, assets, toFiat, positions]);

  // --- Rewards ------------------------------------------------------------

  const { rewardsFiat, rewardAmounts } = useMemo(() => {
    const amounts: AssetAmount[] = [];
    const fiatParts: string[] = [];

    for (const chainId of chainIds) {
      const asset = assets[chainId];
      const chainRewards = rewardsByChain[chainId];
      if (!asset || !chainRewards) continue;

      const total = sumPlanck(Object.values(chainRewards));
      if (!new BigNumber(total).gt(0)) continue;

      amounts.push({ symbol: asset.symbol, precision: asset.precision, amount: total });
      fiatParts.push(toFiat(chainId, total));
    }

    return { rewardsFiat: sumFiat(fiatParts), rewardAmounts: amounts };
  }, [chainIds, assets, rewardsByChain, toFiat]);

  // --- Drill-down rows ----------------------------------------------------

  const claimRows = useMemo(() => {
    const rows: ClaimRow[] = [];

    for (const position of positions) {
      const asset = assets[position.chainId];
      if (!asset) continue;

      const entry = unclaimed[unclaimedKey(position.chainId, position.accountId)];
      const payouts = entry?.payouts ?? [];
      const eras = [...new Set(payouts.map((payout) => payout.era))].sort((a, b) => a - b);

      rows.push({
        key: `${position.chainId}:${position.accountId}`,
        accountId: position.accountId,
        chainId: position.chainId,
        chainName: asset.chainName,
        symbol: asset.symbol,
        precision: asset.precision,
        earned: rewardsByChain[position.chainId]?.[position.accountId] ?? '0',
        unclaimed: entry?.total ?? '0',
        unclaimedKnown: Boolean(entry),
        unclaimedFiat: toFiat(position.chainId, entry?.total ?? '0'),
        eras,
        payouts,
        access: accessFor(position.accountId, position.chainId),
      });
    }

    return rows;
  }, [positions, assets, unclaimed, rewardsByChain, toFiat, accessFor]);

  const unclaimedFooter = useMemo(() => {
    const byAsset = new Map<string, AssetAmount>();
    let soonestDays: number | null = null;
    // Of the chain that owns the soonest expiry — the one the chip warns about.
    let soonestDepth: number | null = null;

    for (const row of claimRows) {
      if (!new BigNumber(row.unclaimed).gt(0)) continue;

      const existing = byAsset.get(row.symbol);
      if (existing) {
        existing.amount = sumPlanck([existing.amount, row.unclaimed]);
      } else {
        byAsset.set(row.symbol, { symbol: row.symbol, precision: row.precision, amount: row.unclaimed });
      }

      const oldest = oldestPayoutEra(row.eras);
      const activeEra = eras[row.chainId];
      if (oldest === null || activeEra === undefined) continue;

      const erasLeft = erasUntilExpiry(oldest, activeEra, historyDepths[row.chainId] ?? undefined);
      const days = daysUntilExpiry(erasLeft, eraDurations[row.chainId] ?? null);
      if (days === null) continue;

      if (soonestDays === null || days < soonestDays) {
        soonestDays = days;
        soonestDepth = historyDepths[row.chainId] ?? null;
      }
    }

    return getUnclaimedFooter({
      totalFiat: sumFiat(claimRows.map((row) => row.unclaimedFiat)),
      amounts: [...byAsset.values()],
      daysUntilExpiry: soonestDays,
      historyDepth: soonestDepth,
    });
  }, [claimRows, eras, eraDurations, historyDepths]);

  const positionRows = useMemo(() => {
    const rows: PositionRow[] = [];

    for (const position of positions) {
      const asset = assets[position.chainId];
      if (!asset) continue;

      rows.push({
        key: `${position.chainId}:${position.accountId}`,
        accountId: position.accountId,
        chainId: position.chainId,
        chainName: asset.chainName,
        symbol: asset.symbol,
        precision: asset.precision,
        staked: position.stake.total,
        stakedFiat: toFiat(position.chainId, position.stake.total),
        unbonding: position.unbonding,
        totalUnbonding: position.totalUnbonding,
        redeemable: position.redeemable,
        access: accessFor(position.accountId, position.chainId),
      });
    }

    return rows.sort((a, b) => new BigNumber(b.stakedFiat).comparedTo(a.stakedFiat) ?? 0);
  }, [positions, assets, toFiat, accessFor]);

  const nominationRows = useMemo(() => {
    const chainNames: Record<string, string> = {};
    for (const entry of chains) {
      chainNames[entry.chainId] = entry.chainName;
    }

    return buildNominationRows(positions, chainNames);
  }, [positions, chains]);

  const breakdownRows = useMemo(() => {
    const rows = positions.map((position, index) => {
      const asset = assets[position.chainId];
      const fiat = toFiat(position.chainId, position.stake.total);

      return {
        key: `${position.chainId}:${position.accountId}`,
        accountId: position.accountId,
        chainId: position.chainId,
        chainName: asset?.chainName ?? '',
        symbol: asset?.symbol ?? '',
        precision: asset?.precision ?? 0,
        value: new BigNumber(fiat).toNumber(),
        stake: position.stake.total,
        fiat,
        color: getColorByPriceId(asset?.priceId ?? '', index),
        apy: apyByChain[position.chainId] ?? null,
        networkAvgRate: avgRateByChain[position.chainId] ?? null,
        validatorCount: position.activeValidators.length,
        earning: position.status === 'active',
      } satisfies BreakdownRow;
    });

    return rows.sort((a, b) => b.value - a.value);
  }, [positions, assets, toFiat, apyByChain, avgRateByChain]);

  return {
    positions,
    summary,
    pending,
    currency,
    fiatFlag,

    totalStakedFiat,
    stakedAmounts,
    unbondingFooter,

    weightedApy,
    earningPositionCount: summary.earningPositionCount,
    networkAvg,

    activeValidatorCount: summary.activeValidatorCount,
    positionCount: summary.positionCount,
    nominationRows,

    rewardsWindowDays: REWARDS_WINDOW_DAYS,
    rewardsFiat,
    rewardAmounts,
    unclaimedFooter,

    breakdownRows,
    claimRows,
    positionRows,

    walletByAccount,
  };
};
