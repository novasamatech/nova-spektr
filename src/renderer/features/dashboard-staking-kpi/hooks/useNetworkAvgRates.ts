import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type NetworkAvgRate, type NetworkAvgRateParams, apy } from '@/domains/staking';
import { networkModel } from '@/entities/network';

import { useChainEras } from './useChainEras';
import { useResourcePool } from './useResourcePool';

const { networkAvgRateResource } = apy;

/**
 * Trailing ~30d network average reward rate per staking chain — the benchmark
 * shown beside the user's Est. APY. Same relay-derived era duration as
 * `useNetworkApys` (Asset Hub has no Babe pallet).
 */
export const useNetworkAvgRates = (chainIds: ChainId[]): Record<ChainId, NetworkAvgRate | null> => {
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const eras = useChainEras();

  const requests = useMemo(() => {
    const result: NetworkAvgRateParams[] = [];

    for (const chainId of chainIds) {
      const chain = chains[chainId];
      const api = apis[chainId];
      const era = eras[chainId];
      if (!chain || !api || era === undefined) continue;

      const timelineApi = (chain.parentId ? apis[chain.parentId] : null) ?? api;
      result.push({ chainId, api, timelineApi, chain, era });
    }

    return result;
  }, [chainIds, chains, apis, eras]);

  useResourcePool(networkAvgRateResource, requests);

  const cache = useUnit(networkAvgRateResource.$cache);

  return useMemo(() => {
    const result: Record<ChainId, NetworkAvgRate | null> = {};

    for (const chainId of chainIds) {
      result[chainId] = cache[chainId] ?? null;
    }

    return result;
  }, [chainIds, cache]);
};
