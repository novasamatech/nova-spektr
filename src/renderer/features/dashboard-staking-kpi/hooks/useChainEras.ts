import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId, type EraIndex } from '@/shared/core';
import { keys } from '@/shared/lib/utils';
import { stakingPallet } from '@/shared/pallet/staking';
import { era } from '@/domains/staking';
import { networkModel } from '@/entities/network';

/**
 * Active era per chain. The subscription itself is owned by the
 * staking-positions aggregate — the KPI row only reads what is already there,
 * so mounting a card never starts a chain subscription.
 */
export const useChainEras = (): Record<ChainId, EraIndex> => {
  return useUnit(era.eraResource.$cache);
};

/**
 * Era duration per chain (ms), used to turn "eras left" into days. `null` for a
 * chain whose anchor the network cannot provide.
 */
export const useEraDurations = (): Record<ChainId, number | null> => {
  const cache = useUnit(era.eraProgressResource.$cache);

  return useMemo(() => {
    const durations: Record<ChainId, number | null> = {};
    for (const chainId of keys(cache)) {
      durations[chainId] = cache[chainId]?.eraDurationMs ?? null;
    }

    return durations;
  }, [cache]);
};

/**
 * How many eras back a payout can still be claimed, per chain — the runtime
 * `HistoryDepth`. Read from the chain rather than assumed: it is 84 on Polkadot
 * and Kusama today, but it is a runtime constant and the payout scan
 * (`payoutsService.getUnclaimedPayouts`) already uses the real value, so a
 * hardcoded countdown would disagree with the set of eras actually searched.
 * `null` for a chain with no api or no staking pallet.
 */
export const useChainHistoryDepths = (): Record<ChainId, number | null> => {
  const apis = useUnit(networkModel.$apis);

  return useMemo(() => {
    const depths: Record<ChainId, number | null> = {};

    for (const chainId of keys(apis)) {
      const api = apis[chainId];
      if (!api) continue;

      try {
        depths[chainId] = stakingPallet.consts.historyDepth(api);
      } catch {
        depths[chainId] = null;
      }
    }

    return depths;
  }, [apis]);
};
