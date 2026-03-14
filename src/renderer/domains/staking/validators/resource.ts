import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { type ValidatorMap } from '../_lib/types';

import { validatorsService } from './service';

// =====================================================
// ============= validatorsResource ====================
// =====================================================

export type ValidatorsResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  era: EraIndex;
};

const $validatorsCache = createStore<Record<ChainId, ValidatorMap>>({});

export const validatorsResource = createQueryResource<ValidatorsResourceParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('validators')
  .request<ValidatorMap>(({ api, era }) => {
    return validatorsService.getValidatorsWithInfo(api, era);
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

// =====================================================
// ============= nominatorsResource ====================
// =====================================================

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
