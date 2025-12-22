import { type ApiPromise } from '@polkadot/api';
import { useMemo } from 'react';

import { type NullableMap } from '@/shared/core';
import { getCreatedDate, nullable } from '@/shared/lib/utils';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import { blockResource, blockTimeResource } from './resource';

export const useBlock = (api?: ApiPromise | null) => {
  return useResource(blockResource, {
    params: api && { api },
    defaultValue: null,
    map: (cache, { api }) => cache[api.genesisHash.toHex()],
  });
};

export const useBlockTime = (api?: ApiPromise | null) => {
  return useResource(blockTimeResource, {
    params: api && { api },
    defaultValue: null,
    map: (cache, { api }) => cache[api.genesisHash.toHex()],
  });
};

export const useBlockTimestamp = ({ api, blockHeight }: NullableMap<{ api: ApiPromise; blockHeight: BlockHeight }>) => {
  const { data: currentBlock, pending: pendingCurrentBlock } = useBlock(api);
  const { data: blockTime, pending: pendingBlockTime } = useBlockTime(api);

  const timestamp = useMemo(() => {
    if (nullable(currentBlock) || nullable(blockHeight) || nullable(blockTime)) return null;
    return getCreatedDate(blockHeight, currentBlock, blockTime.toNumber());
  }, [currentBlock, blockTime]);

  return { data: timestamp, pending: pendingCurrentBlock || pendingBlockTime };
};
