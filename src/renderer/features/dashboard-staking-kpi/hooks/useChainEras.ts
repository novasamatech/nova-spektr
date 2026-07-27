import { useUnit } from 'effector-react';

import { type ChainId, type EraIndex } from '@/shared/core';
import { keys } from '@/shared/lib/utils';
import { era } from '@/domains/staking';

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

  const durations: Record<ChainId, number | null> = {};
  for (const chainId of keys(cache)) {
    durations[chainId] = cache[chainId]?.eraDurationMs ?? null;
  }

  return durations;
};
