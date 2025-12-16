import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type BlockHeight, type ChainId } from '@/shared/core';
import { referendaPallet } from '@/shared/pallet/referenda';
import { createQueryResource } from '@/shared/query';

export type UndecidingTimeoutRequestParams = {
  api: ApiPromise;
};

type CacheState = Record<ChainId, BlockHeight>;

export const undecidingTimeoutResource = createQueryResource<UndecidingTimeoutRequestParams>({
  key: ({ api }) => [api.genesisHash.toHex()],
})
  .request<BlockHeight>(async ({ api }) => {
    await api.isReady;

    return referendaPallet.consts.undecidingTimeout('governance', api);
  })
  .cache<CacheState>({
    store: createStore({}),
    staleAfter: Number.POSITIVE_INFINITY,
    map(state, timeout, { api }) {
      const chainId = api.genesisHash.toHex();

      return { ...state, [chainId]: timeout };
    },
  })
  .build();
