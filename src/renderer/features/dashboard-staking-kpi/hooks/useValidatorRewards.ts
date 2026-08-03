import { useUnit } from 'effector-react';
import { useMemo } from 'react';

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
import { type RewardPeriod, erasInPeriod } from '../lib/reward-period';

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
export const useValidatorRewards = (positions: StakingPosition[], period: RewardPeriod): ValidatorRewardsResult => {
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

      // The active era has not paid anything yet — its arithmetic is not final.
      const eraTo = activeEra - 1;
      const eraFrom = Math.max(0, eraTo - erasInPeriod(period, eraDurations[chainId] ?? null, historyDepth) + 1);
      if (eraTo < eraFrom) continue;

      byChain.set(chainId, {
        chainId,
        api,
        stashes: [position.stake.stash],
        eraFrom,
        eraTo,
        rewardSources: rewardsService.collectChainRewardSources(chain, chains, 'staking-chain'),
      });
    }

    // Sorted so the cache key of a selection does not depend on row order.
    return [...byChain.values()].map((request) => ({ ...request, stashes: [...request.stashes].sort() }));
  }, [positions, chains, apis, eras, eraDurations, period]);

  useResourcePool(eraRewardsResource, requests);

  const cache = useUnit(eraRewardsResource.$cache);

  return useMemo(() => {
    const rewards: ChainEraReward[] = [];
    const pendingChains: ChainId[] = [];

    for (const { chainId, stashes, eraFrom, eraTo } of requests) {
      const entry = cache[eraRewardsCacheKey(chainId, stashes, eraFrom, eraTo)];
      if (entry) {
        rewards.push(...entry.map((reward) => ({ ...reward, chainId })));
      } else {
        pendingChains.push(chainId);
      }
    }

    return { rewards, pendingChains };
  }, [requests, cache]);
};
