import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type MonthlyRewardRecord,
  type MonthlyRewardsParams,
  monthlyCacheKey,
  rewards,
  rewardsService,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';

import { useResourcePool } from './useResourcePool';

const { monthlyRewardsResource } = rewards;

/** A year of history — the same window the rewards chart fetches. */
const HISTORY_MONTHS = 12;

/** One payout as the indexer recorded it, with the chain it belongs to. */
export type RawPayoutRow = MonthlyRewardRecord & {
  chainId: ChainId;
  chainName: string;
};

type Request = { chainId: ChainId; accountIds: AccountId[] };

export type RawRewardPayouts = {
  rows: RawPayoutRow[];
  /**
   * Chains whose payout history answered, but not from every source — the rows
   * are real, the ones a silent source holds are missing — and chains with no
   * source to ask at all. A file exported from them could not be reconciled
   * against the chain.
   */
  incompleteChains: ChainId[];
  /** Chains whose payout history has not answered yet. */
  pendingChains: ChainId[];
  /** Re-runs every history request whose answer is not complete. */
  retry: () => Promise<void>;
};

/**
 * Anchored to the first of the month twelve months back, matching the chart, so
 * the two share a cache entry instead of each paying for its own year.
 */
export function useRawPayoutsSince(now = Date.now()): number {
  const date = new Date(now);
  const anchor = new Date(date.getFullYear(), date.getMonth() - HISTORY_MONTHS, 1).getTime();

  return useMemo(() => Math.floor(anchor / 1000), [anchor]);
}

/**
 * The indexer's own payout rows for the given accounts, per chain.
 *
 * Deliberately not derived from the rewards card's figures: those are sums over
 * a 30-day window, and a sum cannot be reconciled against a chain. This returns
 * what the indexer returned — one row per payout, with its block — which is
 * what an export is for.
 *
 * Mounted by the modal rather than the row, so nobody pays for a year of
 * history until they ask to see it.
 *
 * The cache entry it shares with the chart is keyed by chain and accounts
 * alone, so whichever of the two fills it decides what the other reads. That is
 * only safe while both ask the same endpoints — one more reason the source set
 * is taken from `collectChainRewardSources` rather than assembled here.
 */
export const useRawRewardPayouts = (requests: Request[]): RawRewardPayouts => {
  const chains = useUnit(networkModel.$chains);
  const since = useRawPayoutsSince();

  const { params, sourcelessChains } = useMemo(() => {
    const result: MonthlyRewardsParams[] = [];
    const sourceless: ChainId[] = [];

    for (const { chainId, accountIds } of requests) {
      const chain = chains[chainId];
      if (!chain || accountIds.length === 0) continue;

      // `staking-chain`: every request here comes from a drill-down row, and a
      // row is a position — the chain is where the stake actually lives. This
      // used to hand-roll a narrower set that left out the relay's staking
      // indexer, so an export of an Asset Hub stash stopped at the migration
      // date while the rewards chart, which does read the relay, kept showing
      // the years before it.
      const rewardSources = rewardsService.collectChainRewardSources(chain, chains, 'staking-chain');
      // Never requested: its history is unknown, which is not "no payouts".
      if (rewardSources.length === 0) {
        sourceless.push(chainId);
        continue;
      }

      result.push({ chainId, accounts: accountIds, rewardSources, since });
    }

    return { params: result, sourcelessChains: sourceless };
  }, [requests, chains, since]);

  useResourcePool(monthlyRewardsResource, params);

  const cache = useUnit(monthlyRewardsResource.$cache);
  const { invalidate, fetch } = useUnit({
    invalidate: monthlyRewardsResource.invalidate,
    fetch: monthlyRewardsResource.fetch,
  });

  const retry = useCallback(async () => {
    const incomplete = params.filter(({ chainId, accounts }) => {
      const entry = cache[monthlyCacheKey(chainId, accounts)];

      return entry !== undefined && entry.completeness !== 'complete';
    });

    await Promise.all(
      incomplete.map(async (request) => {
        // Dropped first: a refetch inside the cache window would be answered
        // with the very result being retried.
        await invalidate(request);
        await fetch(request).catch(() => null);
      }),
    );
  }, [params, cache, invalidate, fetch]);

  return useMemo(() => {
    const rows: RawPayoutRow[] = [];
    const incompleteChains: ChainId[] = [...sourcelessChains];
    const pendingChains: ChainId[] = [];

    for (const { chainId, accounts } of params) {
      const entry = cache[monthlyCacheKey(chainId, accounts)];
      if (!entry) {
        pendingChains.push(chainId);
        continue;
      }

      if (entry.completeness !== 'complete') {
        incompleteChains.push(chainId);
      }

      const chainName = chains[chainId]?.name ?? '';
      for (const record of entry.records) {
        rows.push({ ...record, chainId, chainName });
      }
    }

    // Newest first: an export is read top-down, and the last payout is the one
    // people look for.
    rows.sort((a, b) => b.timestamp - a.timestamp);

    return { rows, incompleteChains, pendingChains, retry };
  }, [params, sourcelessChains, cache, chains, retry]);
};
