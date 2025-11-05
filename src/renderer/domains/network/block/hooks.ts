import { type ApiPromise } from '@polkadot/api';

import { type NullableMap } from '@/shared/core';
import { useAsync } from '@/shared/lib/hooks';
import { getCreatedDateFromApi } from '@/shared/lib/utils';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import { blockResource } from './resource';

export const useBlock = (api: ApiPromise | null) => {
  return useResource(blockResource, {
    params: api && { api },
    defaultValue: null,
    map: (cache, { api }) => cache[api.genesisHash.toHex()],
  });
};

export const useBlockTime = ({ api, blockHeight }: NullableMap<{ api: ApiPromise; blockHeight: BlockHeight }>) => {
  return useAsync({
    asyncFn: () => {
      if (!api || !blockHeight) return Promise.resolve(null);
      return getCreatedDateFromApi(blockHeight, api);
    },
    dependencies: [api, blockHeight],
  });
};
