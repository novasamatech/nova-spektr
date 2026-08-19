import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type PayoutsResourceParams,
  type RewardSource,
  type StakingPosition,
  type UnclaimedPayouts,
  payouts,
  payoutsCacheKey,
  rewardsService,
} from '@/domains/staking';
import { networkModel } from '@/entities/network';

import { useChainEras } from './useChainEras';
import { useResourcePool } from './useResourcePool';

const { payoutsResource } = payouts;

/** Unclaimed payouts keyed by `chainId:accountId`. */
export type UnclaimedByPosition = Record<string, UnclaimedPayouts>;

export function unclaimedKey(chainId: ChainId, accountId: AccountId): string {
  return `${chainId}:${accountId}`;
}

/**
 * Unclaimed payouts of every position. One request per (chain, stash) — the
 * payout scan is per-stash on chain, so there is no batched form of it, and the
 * pool makes sure a stash queried twice only fetches once.
 */
export const useUnclaimedPayoutsByPosition = (positions: StakingPosition[]): UnclaimedByPosition => {
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const eras = useChainEras();

  const requests = useMemo(() => {
    const result: PayoutsResourceParams[] = [];
    const sourcesByChain = new Map<ChainId, RewardSource[]>();

    for (const position of positions) {
      const { chainId, accountId } = position;
      const chain = chains[chainId];
      const api = apis[chainId];
      const activeEra = eras[chainId];
      if (!chain || !api || activeEra === undefined) continue;

      let rewardSources = sourcesByChain.get(chainId);
      if (!rewardSources) {
        rewardSources = rewardsService.collectChainRewardSources(chain, chains, 'staking-chain');
        sourcesByChain.set(chainId, rewardSources);
      }

      let historyDepth: number;
      try {
        historyDepth = stakingPallet.consts.historyDepth(api);
      } catch {
        // A chain without the staking pallet has no payouts to scan.
        continue;
      }

      result.push({ chainId, api, stash: accountId, activeEra, historyDepth, rewardSources });
    }

    return result;
  }, [positions, chains, apis, eras]);

  useResourcePool(payoutsResource, requests);

  const cache = useUnit(payoutsResource.$cache);

  return useMemo(() => {
    const result: UnclaimedByPosition = {};

    for (const { chainId, stash, activeEra } of requests) {
      const entry = cache[payoutsCacheKey(chainId, stash, activeEra)];
      if (entry) {
        result[unclaimedKey(chainId, stash)] = entry;
      }
    }

    return result;
  }, [requests, cache]);
};
