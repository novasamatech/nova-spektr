import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { keys } from '@/shared/lib/utils';
import { type NetworkAvgRate, type StakingPosition } from '@/domains/staking';
import {
  type NetworkAvgBlend,
  blendNetworkAvgRate,
  computeWeightedApy,
  earningStakeByChain,
  sameContributingChains,
} from '../lib/apy';

import { useNetworkApys } from './useNetworkApys';
import { useNetworkAvgRates } from './useNetworkAvgRates';

type ApyKpi = {
  /** The user's stake-weighted APY, `null` when nothing can be weighted. */
  weightedApy: number | null;
  /** The network benchmark blended with the same weights; `null` while unknown. */
  networkAvg: NetworkAvgBlend | null;
  apyByChain: Record<ChainId, number | null>;
  avgRateByChain: Record<ChainId, NetworkAvgRate | null>;
};

/**
 * The Est. APY card's two figures, blended from the same fiat weights (active
 * stake of the earning positions). The benchmark is dropped to `null` unless
 * its contributing chains are exactly the headline's — the two readings fail
 * independently, and the figures must describe the same portfolio to sit next
 * to each other.
 */
export function useApyKpi(
  positions: StakingPosition[],
  chainIds: ChainId[],
  toFiat: (chainId: ChainId, planck: string) => string,
): ApyKpi {
  const apyByChain = useNetworkApys(chainIds);
  const avgRateByChain = useNetworkAvgRates(chainIds);

  const { weightedApy, networkAvg } = useMemo(() => {
    const earningStake = earningStakeByChain(positions);
    const chainWeights = keys(earningStake).map((chainId) => ({
      chainId,
      weight: toFiat(chainId, earningStake[chainId] ?? '0'),
    }));

    const apyEntries = chainWeights.map((entry) => ({ ...entry, apy: apyByChain[entry.chainId] ?? null }));
    const rateEntries = chainWeights.map((entry) => ({ ...entry, rate: avgRateByChain[entry.chainId] ?? null }));

    return {
      weightedApy: computeWeightedApy(apyEntries),
      networkAvg: sameContributingChains(apyEntries, rateEntries) ? blendNetworkAvgRate(rateEntries) : null,
    };
  }, [positions, apyByChain, avgRateByChain, toFiat]);

  return { weightedApy, networkAvg, apyByChain, avgRateByChain };
}
