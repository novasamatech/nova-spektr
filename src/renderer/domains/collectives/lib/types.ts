import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';

export type CollectivePalletsType = 'fellowship' | 'ambassador';

export type Store<T> = Partial<Record<CollectivePalletsType, Record<ChainId, T>>>;

export type RequestCollectiveParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};
