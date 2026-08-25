import { type ApiPromise } from '@polkadot/api';
import { useMemo } from 'react';

import { type Chain, type ChainId, type EraIndex, type NullableMap } from '@/shared/core';
import { nonNullableMap } from '@/shared/lib/utils';
import { useResource } from '@/shared/query';

import {
  type ActiveEraAnchor,
  type EraProgress,
  type EraProgressResourceParams,
  type EraResourceParams,
  eraProgressResource,
  eraResource,
} from './resource';

export const useActiveEra = (
  params: NullableMap<EraResourceParams>,
): { data: EraIndex | undefined; pending: boolean } => {
  return useResource(eraResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: undefined as EraIndex | undefined,
    map: (cache: Record<ChainId, EraIndex>, p: EraResourceParams) => cache[p.chainId],
  });
};

/**
 * Stable anchor of the given era — derive countdowns from it on the client.
 */
export const useEraProgress = (params: NullableMap<EraProgressResourceParams>) => {
  return useResource(eraProgressResource, {
    params: nonNullableMap(params) ? params : null,
    defaultValue: null as EraProgress,
    map: (cache, { chainId, era }) => {
      const entry = cache[chainId];
      if (entry === undefined) return undefined;
      if (entry === null) return null;

      return entry.era === era ? entry : undefined;
    },
  });
};

type EraAnchorParams = {
  chainId: ChainId;
  api: ApiPromise | null;
  /** Where era timing is read — the relay chain for Asset Hub. */
  timelineApi: ApiPromise | null;
  chain: Chain | null;
};

/**
 * The chain's active era plus its timing, or `null` while either cannot be
 * established. Everything a card says about era dates derives from it — when it
 * is `null` the card carries no date rather than an estimate.
 */
export const useEraAnchor = ({ chainId, api, timelineApi, chain }: EraAnchorParams): ActiveEraAnchor | null => {
  const { data: era } = useActiveEra({ chainId, api });
  const { data: progress } = useEraProgress({ chainId, api, timelineApi, chain, era: era ?? null });

  return useMemo(() => {
    if (era === undefined || !progress || progress.era !== era) return null;
    if (progress.eraDurationMs <= 0) return null;

    return progress;
  }, [era, progress]);
};
