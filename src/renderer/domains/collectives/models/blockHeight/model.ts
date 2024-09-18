import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@shared/effector';
import { getCurrentBlockNumber } from '@shared/lib/utils';
import { type BlockHeight } from '@shared/polkadotjs-schemas';

type RequestParams = {
  api: ApiPromise;
  chainId: ChainId;
};

const { $: $blockHeight, request } = createDataSource<Record<ChainId, BlockHeight>, RequestParams, BlockHeight>({
  initial: {},
  fn: ({ api }) => getCurrentBlockNumber(api) as Promise<BlockHeight>,
  map: (store, { params, result }) => ({
    ...store,
    [params.chainId]: result,
  }),
});

export const blockHeightModel = {
  $blockHeight,
  request,
};
