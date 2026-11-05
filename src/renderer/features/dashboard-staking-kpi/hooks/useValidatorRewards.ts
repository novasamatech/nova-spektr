import { useUnit } from 'effector-react';
import { useCallback, useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import {
  type EraRewardsParams,
  type EraValidatorReward,
  type StakingPosition,
  eraRewards,
  eraRewardsCacheKey,
  rewardsService,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { type RewardWindow, windowEraRange } from '../lib/reward-period';

import { useChainEras, useEraDurations } from './useChainEras';
import { useResourcePool } from './useResourcePool';

const { eraRewardsResource } = eraRewards;

/**
 * A domain reward record with the chain it came from — the domain answers per
 * chain.
 */
export type ChainEraReward = EraValidatorReward & { chainId: ChainId };

export type ValidatorRewardsResult = {
  rewards: ChainEraReward[];
  /**
   * Chains whose attribution has not arrived yet — the view says so instead of
   * showing a hole.
   */
  pendingChains: ChainId[];
  /**
   * Chains whose attribution answered, but not completely — what it found is
   * real and adds up to a lower bound, what it did not find is unknown. "Earned
   * nothing" is never true of them.
   */
  incompleteChains: ChainId[];
  /**
   * Chains whose attribution could not be loaded at all — a subset of
   * `incompleteChains`.
   */
  unavailableChains: ChainId[];
  /** Re-runs every attribution whose answer is not complete. */
  retry: () => Promise<void>;
};

/**
 * What each validator earned for the selection over the chosen window.
 *
 * One request per **chain**, not per stash: accounts of a wallet usually back
 * the same operators, and the indexer rows — one per (era, validator), carrying
 * the validator's whole nominator list — are what the request actually costs.
 * Asking per stash would re-download the same rows once per account.
 *
 * The era range is what keeps that affordable, which is why the window is a
 * parameter of the fetch rather than a filter over a fetched year.
 */
export const useValidatorRewards = (
  positions: StakingPosition[],
  rewardWindow: RewardWindow,
): ValidatorRewardsResult => {
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const eras = useChainEras();
  const eraDurations = useEraDurations();

  const requests = useMemo(() => {
    const byChain = new Map<ChainId, EraRewardsParams>();

    for (const position of positions) {
      const { chainId } = position;
      const chain = chains[chainId];
      const api = apis[chainId];
      const activeEra = eras[chainId];
      if (!chain || !api || activeEra === undefined) continue;

      const existing = byChain.get(chainId);
      if (existing) {
        if (!existing.stashes.includes(position.stake.stash)) {
          existing.stashes.push(position.stake.stash);
        }
        continue;
      }

      let historyDepth: number;
      try {
        historyDepth = stakingPallet.consts.historyDepth(api);
      } catch {
        // A chain without the staking pallet has no eras to attribute.
        continue;
      }

      const eraRange = windowEraRange(rewardWindow, {
        activeEra,
        eraDurationMs: eraDurations[chainId] ?? null,
        historyDepth,
      });
      // Nothing closed inside the window, nothing of it still on chain — or the
      // window is a custom range still waiting for its dates.
      if (!eraRange) continue;

      byChain.set(chainId, {
        chainId,
        api,
        stashes: [position.stake.stash],
        ...eraRange,
        rewardSources: rewardsService.collectChainRewardSources(chain, chains, 'staking-chain'),
      });
    }

    // Sorted so the cache key of a selection does not depend on row order.
    return [...byChain.values()].map((request) => ({ ...request, stashes: [...request.stashes].sort() }));
  }, [positions, chains, apis, eras, eraDurations, rewardWindow]);

  useResourcePool(eraRewardsResource, requests);

  const cache = useUnit(eraRewardsResource.$cache);
  const { invalidate, fetch } = useUnit({ invalidate: eraRewardsResource.invalidate, fetch: eraRewardsResource.fetch });

  const retry = useCallback(async () => {
    const incomplete = requests.filter(({ chainId, stashes, eraFrom, eraTo }) => {
      const entry = cache[eraRewardsCacheKey(chainId, stashes, eraFrom, eraTo)];

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
  }, [requests, cache, invalidate, fetch]);

  return useMemo(() => {
    const rewards: ChainEraReward[] = [];
    const pendingChains: ChainId[] = [];
    const incompleteChains: ChainId[] = [];
    const unavailableChains: ChainId[] = [];

    for (const { chainId, stashes, eraFrom, eraTo } of requests) {
      const entry = cache[eraRewardsCacheKey(chainId, stashes, eraFrom, eraTo)];
      if (!entry) {
        pendingChains.push(chainId);
        continue;
      }

      rewards.push(...entry.rewards.map((reward) => ({ ...reward, chainId })));
      if (entry.completeness !== 'complete') {
        incompleteChains.push(chainId);
      }
      if (entry.completeness === 'unavailable') {
        unavailableChains.push(chainId);
      }
    }

    return { rewards, pendingChains, incompleteChains, unavailableChains, retry };
  }, [requests, cache, retry]);
};
