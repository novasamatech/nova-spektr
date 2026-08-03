import { useMemo } from 'react';

import { type Chain, type ChainId } from '@/shared/core';
import { useActiveEra, useEraProgress } from '@/domains/staking';
import { useApi } from '@/entities/network';
import { type RewardsEraAnchor } from '../lib/era';

/** Placeholder key for "no chain selected" — resolves to no api, hence no era. */
const NO_CHAIN: ChainId = '0x00';

/**
 * The chain's era anchor, or `null` while it cannot be established. Everything
 * the hover card says about eras is derived from it — when it is `null` the
 * title simply carries no era rather than an estimate.
 */
export const useRewardsEraAnchor = (chain: Chain | null): RewardsEraAnchor | null => {
  const chainId = chain?.chainId ?? NO_CHAIN;
  const api = useApi(chainId);
  // Asset Hub carries neither `session` nor `babe`, so era timing is read off
  // the relay chain — the same pairing the staking positions aggregate uses.
  const relayApi = useApi(chain?.parentId ?? chainId);

  const { data: era } = useActiveEra({ chainId, api });
  const { data: progress } = useEraProgress({
    chainId,
    api,
    timelineApi: relayApi ?? api,
    chain,
    era: era ?? null,
  });

  return useMemo(() => {
    if (era === undefined || !progress || progress.era !== era) return null;
    if (progress.eraDurationMs <= 0) return null;

    return { era, eraStartMs: progress.eraStartMs, eraDurationMs: progress.eraDurationMs };
  }, [era, progress]);
};
