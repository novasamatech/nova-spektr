import { type ApiPromise } from '@polkadot/api';

import { useResource } from '@/shared/query';

import { blockResource } from './resource';

export const useBlock = (api: ApiPromise | null) => {
  return useResource(blockResource, {
    params: api && { api },
    defaultValue: null,
    map: (cache, { api }) => cache[api.genesisHash.toHex()],
  });
};
