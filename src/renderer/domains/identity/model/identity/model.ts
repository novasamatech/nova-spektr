import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { identityPallet } from '@shared/pallet/identity';

import { type AccountIdentity } from './types';

type Data = Record<AccountId, AccountIdentity>;
type Store = Record<ChainId, Data>;
type RequestParams = {
  accounts: AccountId[];
  chainId: ChainId;
  api: ApiPromise;
};

const {
  $: $list,
  request,
  pending,
  fail,
} = createDataSource<Store, RequestParams, Data>({
  initial: {},
  async fn({ api, accounts }) {
    const response = await identityPallet.storage.identityOf(api, accounts);

    return response.reduce<Data>((acc, record) => {
      if (record.identity) {
        acc[record.account] = {
          accountId: record.account,
          name: record.identity[0].info.display,
        };
      }

      return acc;
    }, {});
  },
  map(store, { params, result }) {
    const previousData = store[params.chainId] ?? {};

    return {
      ...store,
      [params.chainId]: {
        ...previousData,
        ...result,
      },
    };
  },
});

export const identityDomainModel = {
  $list,
  request,
  pending,
  fail,
};
