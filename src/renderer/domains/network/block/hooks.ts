import { type ApiPromise } from '@polkadot/api';
import { useMemo } from 'react';

import { type Chain, type NullableMap } from '@/shared/core';
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

export const useBlockTime = (api?: ApiPromise | null, chain?: Chain | null) => {
  return useResource(blockTimeResource, {
    params: api && chain ? { api, chain } : null,
    defaultValue: null,
    map: (cache, { chain }) => cache[chain.chainId],
  });
};

/**
 * Projects a block height on `chain`'s timeline to a wall-clock moment. `api`
 * must be the api _of that chain_ — both the current height and the block time
 * are read from it, and a mismatched pair silently dates the block against a
 * foreign clock.
 */
export const useBlockTimestamp = ({
  api,
  blockHeight,
  chain,
}: NullableMap<{ api: ApiPromise; blockHeight: BlockHeight; chain: Chain }>) => {
  const { data: currentBlock, pending: pendingCurrentBlock } = useBlock(api);
  const { data: blockTime, pending: pendingBlockTime } = useBlockTime(api, chain);

  const timestamp = useMemo(() => {
    if (nullable(currentBlock) || nullable(blockHeight) || nullable(blockTime)) return null;
    return getCreatedDate(blockHeight, currentBlock, blockTime.toNumber());
  }, [currentBlock, blockHeight, blockTime]);

  return { data: timestamp, pending: pendingCurrentBlock || pendingBlockTime };
};
