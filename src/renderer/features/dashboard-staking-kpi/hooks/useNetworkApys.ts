import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import { type ApyResourceParams, apy } from '@/domains/staking';
import { networkModel } from '@/entities/network';

import { useChainEras } from './useChainEras';
import { useResourcePool } from './useResourcePool';

const { apyResource } = apy;

/**
 * Network APY (percent) per staking chain. Asset Hub has no Babe pallet, so the
 * era duration behind the calculation is read from the relay chain — hence the
 * separate `timelineApi`.
 */
export const useNetworkApys = (chainIds: ChainId[]): Record<ChainId, number | null> => {
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);
  const eras = useChainEras();

  const requests = useMemo(() => {
    const result: ApyResourceParams[] = [];

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

  useResourcePool(apyResource, requests);

  const cache = useUnit(apyResource.$cache);

  return useMemo(() => {
    const result: Record<ChainId, number | null> = {};

    for (const chainId of chainIds) {
      const value = cache[chainId];
      const parsed = value === null || value === undefined ? Number.NaN : Number(value);
      result[chainId] = Number.isFinite(parsed) ? parsed : null;
    }

    return result;
  }, [chainIds, cache]);
};
