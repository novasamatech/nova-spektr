import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { useApi } from '@/entities/network';
import { NO_CHAIN } from '../lib/constants';

/**
 * How many eras of exposures the chain keeps (`staking.historyDepth`, 84 on
 * Polkadot and Kusama) — the ceiling of the drill-down's range. `null` until
 * the api is up; a runtime without the constant answers `null` too rather than
 * a guess.
 */
export const useHistoryDepth = (chain: Chain | null): number | null => {
  const api = useApi(chain?.chainId ?? NO_CHAIN);

  return useMemo(() => {
    if (!api) return null;
    try {
      return stakingPallet.consts.historyDepth(api);
    } catch {
      return null;
    }
  }, [api]);
};
