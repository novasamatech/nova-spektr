import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { exposuresResource } from '../exposures/resource';
import { type ValidatorMap } from '../types';

import { validatorsService } from './service';
import { type EraValidatorMap } from './types';

export type ValidatorsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  era: EraIndex;
  /** Relay-chain api. Optional: enables the authored-blocks probe. */
  timelineApi?: ApiPromise | null;
};

const $validatorsCache = createStore<Record<ChainId, EraValidatorMap>>({});

export const validatorsResource = createQueryResource<ValidatorsResourceParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('validators')
  .request<EraValidatorMap>(async ({ chainId, api, era, timelineApi }) => {
    // Reuses the exposures cache - the overviews are the same prefix read.
    const overviews = await exposuresResource.fetch({ chainId, api, era });

    return validatorsService.getEraValidators({ api, chainId, era, timelineApi, overviews });
  })
  .cache({
    store: $validatorsCache,
    map: (state, validators, { chainId }) => ({
      ...state,
      [chainId]: validators,
    }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();

export type NominatorsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  stash: AccountId;
};

type NominatorsCache = Record<string, ValidatorMap>;

function cacheKey(chainId: ChainId, stash: AccountId): string {
  return `${chainId}_${stash}`;
}

const $nominatorsCache = createStore<NominatorsCache>({});

export const nominatorsResource = createQueryResource<NominatorsResourceParams>({
  key: ({ chainId, stash }) => [chainId, stash],
})
  .name('nominators')
  .request<ValidatorMap>(({ api, stash }) => {
    return validatorsService.getNominators(api, stash);
  })
  .cache({
    store: $nominatorsCache,
    map: (state, nominators, { chainId, stash }) => ({
      ...state,
      [cacheKey(chainId, stash)]: nominators,
    }),
  })
  .build();

export { cacheKey as nominatorsCacheKey };
