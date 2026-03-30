import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';
import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { governanceService } from '@/entities/governance';

export type TrackLocksRequestParams = {
  api: ApiPromise;
  accounts: AccountId[];
};

type CacheState = Record<ChainId, Record<AccountId, Record<string, BN>>>;

export const trackLocksResource = createQueryResource<TrackLocksRequestParams>({
  key: ({ api, accounts }) => [api.genesisHash.toHex(), ...accounts],
})
  .request<Record<AccountId, Record<string, BN>>>(({ api, accounts }) => governanceService.getTrackLocks(api, accounts))
  .cache<CacheState>({
    store: createStore<CacheState>({}),
    staleAfter: 60_000,
    map(state, locks, { api }) {
      return { ...state, [api.genesisHash.toHex()]: locks };
    },
  })
  .build();
