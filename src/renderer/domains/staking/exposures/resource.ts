import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type EraIndex } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';

import { exposureService } from './service';
import { type ExposureMap, type ExposureOverviewMap } from './types';

export type ExposuresResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  era: EraIndex;
};

/**
 * Only the latest requested era is retained per chain: the cache mapper
 * replaces the whole chain entry, which bounds memory (~600 entries per era)
 * and implicitly invalidates the previous era.
 */
type ExposuresCache = Record<ChainId, { era: EraIndex; overviews: ExposureOverviewMap }>;

const $exposuresCache = createStore<ExposuresCache>({});

export const exposuresResource = createQueryResource<ExposuresResourceParams>({
  key: ({ chainId, era }) => [chainId, String(era)],
})
  .name('exposures')
  .request<ExposureOverviewMap>(({ api, era }) => {
    return exposureService.getEraOverviews(api, era);
  })
  // The overview walk is the single biggest read of the staking stack and
  // everything downstream (positions, validators) waits on it — one rate-limited
  // response must not fail the era for the rest of the session.
  .retry({ count: 3, delay: 1000 })
  .cache({
    store: $exposuresCache,
    map: (state, overviews, { chainId, era }) => ({ ...state, [chainId]: { era, overviews } }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();

export type ExposurePagesResourceParams = {
  chainId: ChainId;
  api: ApiPromise;
  era: EraIndex;
  validators: AccountId[];
};

type ExposurePagesCache = Record<string, ExposureMap>;

function cacheKey(chainId: ChainId, era: EraIndex, validators: AccountId[]): string {
  return `${chainId}_${era}_${sortValidators(validators).join('_')}`;
}

function sortValidators(validators: AccountId[]): AccountId[] {
  return [...validators].sort();
}

const $exposurePagesCache = createStore<ExposurePagesCache>({});

export const exposurePagesResource = createQueryResource<ExposurePagesResourceParams>({
  key: ({ chainId, era, validators }) => [chainId, String(era), sortValidators(validators).join('_')],
})
  .name('exposurePages')
  .request<ExposureMap>(async ({ chainId, api, era, validators }) => {
    const overviews = await exposuresResource.fetch({ chainId, api, era });

    return exposureService.getExposurePages(api, era, validators, overviews);
  })
  .cache({
    store: $exposurePagesCache,
    map: (state, exposures, { chainId, era, validators }) => ({
      ...state,
      [cacheKey(chainId, era, validators)]: exposures,
    }),
    staleAfter: Number.POSITIVE_INFINITY,
  })
  .build();

export { cacheKey as exposurePagesCacheKey };
