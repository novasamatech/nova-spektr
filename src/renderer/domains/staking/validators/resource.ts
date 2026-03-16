import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { type ValidatorMap } from '../_lib/types';

import { getAvgApy, validatorsService } from './service';

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

// =====================================================
// ============= apyResource ===========================
// =====================================================

export type ApyResourceParams = {
  api: ApiPromise;
  chainId: ChainId;
  era: EraIndex;
};

const $apyCache = createStore<Record<ChainId, string | null>>({});

export const apyResource = createQueryResource<ApyResourceParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('networkApy')
  .request<string | null>(async ({ api, chainId: _chainId, era }) => {
    const validatorMap = await validatorsService.getValidatorsWithInfo(api, era);
    const apyValidators = Object.values(validatorMap).filter(
      v => v.totalStake !== undefined && v.commission !== undefined,
    );
    if (apyValidators.length === 0) return null;
    const result = await getAvgApy(api, apyValidators);
    return result || null;
  })
  .cache({
    store: $apyCache,
    map: (state, apy, { chainId }) => ({ ...state, [chainId]: apy }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();
