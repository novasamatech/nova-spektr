import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ChainId } from '@/shared/core';
import {
  type EraValidatorMap,
  type ExposureMap,
  type StakingPosition,
  exposurePagesCacheKey,
  exposures,
  validators,
} from '@/domains/staking';
import { stakingPositions } from '@/aggregates/staking-positions';
import { type SpreadRow, buildSpreadRows } from '../lib/spread';

import { useChainEras } from './useChainEras';
import { useStakingChainAssets } from './useStakingChainAssets';

/**
 * Every nomination of the selection with the era's answer attached.
 *
 * Reads only what `aggregates/staking-positions` already subscribes to — the
 * exposure cache is keyed by (chain, era, nominated set), so this hook must ask
 * with the very same nominated set or it would look up an entry nobody wrote.
 */
export const useNominationSpread = (positions: StakingPosition[]): SpreadRow[] => {
  const exposureCache = useUnit(exposures.exposurePagesResource.$cache);
  const validatorCache = useUnit(validators.validatorsResource.$cache);
  const nominated = useUnit(stakingPositions.$nominatedValidators);
  const eras = useChainEras();
  const { byChain } = useStakingChainAssets();

  return useMemo(() => {
    const exposuresByChain: Record<ChainId, ExposureMap> = {};
    const eraValidatorsByChain: Record<ChainId, EraValidatorMap> = {};
    const metaByChain: Record<ChainId, { chainName: string; symbol: string; precision: number }> = {};

    for (const position of positions) {
      const { chainId } = position;
      if (exposuresByChain[chainId]) continue;

      const era = eras[chainId];
      const validatorSet = nominated[chainId];
      const asset = byChain[chainId];
      if (era === undefined || !validatorSet || !asset) continue;

      const entry = exposureCache[exposurePagesCacheKey(chainId, era, validatorSet)];
      if (!entry) continue;

      exposuresByChain[chainId] = entry;
      metaByChain[chainId] = {
        chainName: asset.chainName,
        symbol: asset.symbol,
        precision: asset.precision,
      };

      const eraValidators = validatorCache[chainId];
      if (eraValidators) {
        eraValidatorsByChain[chainId] = eraValidators;
      }
    }

    return buildSpreadRows({ positions, exposuresByChain, eraValidatorsByChain, metaByChain });
  }, [positions, exposureCache, validatorCache, nominated, eras, byChain]);
};
