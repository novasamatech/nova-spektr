import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId, type TrackId, type TrackInfo } from '@/shared/core';
import { createQueryResource } from '@/shared/query';
import { governanceService } from '@/entities/governance';

export type TracksRequestParams = {
  api: ApiPromise;
};

type CacheState = Record<ChainId, Record<TrackId, TrackInfo>>;

export const tracksResource = createQueryResource<TracksRequestParams>({
  key: ({ api }) => [api.genesisHash.toHex()],
})
  .request<Record<TrackId, TrackInfo>>(async ({ api }) => {
    await api.isReady;

    return governanceService.getTracks(api);
  })
  .cache<CacheState>({
    store: createStore({}),
    staleAfter: Number.POSITIVE_INFINITY,
    map(state, tracks, { api }) {
      const chainId = api.genesisHash.toHex();

      return { ...state, [chainId]: tracks };
    },
  })
  .build();
