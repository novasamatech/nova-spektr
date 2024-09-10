import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';

export type CollectivePalletsType = 'fellowship' | 'ambassador';

type StoreData = {
  members: Member[];
  referendums: any;
  salary: any;
  core: any;
  treasury: any;
};

export type Store = Record<CollectivePalletsType, Record<ChainId, Partial<StoreData>>>;

export type RequestCollectiveParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

export type Member = {
  accountId: string;
  member: { rank: number };
};
