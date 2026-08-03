import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type ExposureMap,
  type StakingPosition,
  era as eraStore,
  exposurePagesCacheKey,
  exposures as exposuresStore,
  validators as validatorsStore,
} from '@/domains/staking';
import { stakingPositions } from '@/aggregates/staking-positions';
import { type NominationCounts, type NominationRow, buildNominationRows, countNominations } from '../lib';

const EMPTY_EXPOSURES: ExposureMap = {};
const EMPTY_VALIDATORS: AccountId[] = [];

export type NominationRowsResult = {
  rows: NominationRow[];
  counts: NominationCounts;
};

const EMPTY_COUNTS: NominationCounts = { total: 0, active: 0, waiting: 0, droppedOut: 0 };

/**
 * The drawer's nominations table.
 *
 * Reads only what `aggregates/staking-positions` already fetched — including
 * the exposure pages, which it scopes to the union of validators the selection
 * nominates. The cache key must be rebuilt from that same union, or the lookup
 * misses and every "our stake" silently reads empty.
 */
export const useNominationRows = (position: StakingPosition | null): NominationRowsResult => {
  const eraCache = useUnit(eraStore.eraResource.$cache);
  const validatorCache = useUnit(validatorsStore.validatorsResource.$cache);
  const exposureCache = useUnit(exposuresStore.exposurePagesResource.$cache);
  const nominatedByChain = useUnit(stakingPositions.$nominatedValidators);

  return useMemo(() => {
    if (nullable(position)) return { rows: [], counts: EMPTY_COUNTS };

    const activeEra = eraCache[position.chainId];
    const eraValidators = validatorCache[position.chainId] ?? null;

    const exposures = nullable(activeEra)
      ? EMPTY_EXPOSURES
      : (exposureCache[
          exposurePagesCacheKey(position.chainId, activeEra, nominatedByChain[position.chainId] ?? EMPTY_VALIDATORS)
        ] ?? EMPTY_EXPOSURES);

    const rows = buildNominationRows({
      stash: position.stake.stash,
      nominations: position.nominations,
      activeValidators: position.activeValidators,
      eraValidators,
      exposures,
    });

    return { rows, counts: countNominations(rows) };
  }, [position, eraCache, validatorCache, exposureCache, nominatedByChain]);
};
