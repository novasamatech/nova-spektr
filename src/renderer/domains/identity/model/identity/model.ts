import { type ApiPromise } from '@polkadot/api';
import { createEvent, sample } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { nullable } from '@shared/lib/utils';
import { networkModel } from '@/entities/network';

import { type AccountIdentity } from './types';

type Data = Record<AccountId, AccountIdentity>;
type Store = Record<ChainId, Data>;
type RequestParams = {
  accounts: AccountId[];
  chainId: ChainId;
};

type InnerRequestParams = {
  accounts: AccountId[];
  chainId: ChainId;
  api: ApiPromise;
};

const {
  $: $list,
  request: requestIdentity,
  pending,
  fail,
} = createDataSource<Store, InnerRequestParams, Data>({
  initial: {},
  async fn({ api, accounts }) {
    const response = await identityPallet.storage.identityOf(api, accounts);

    return response.reduce<Data>((acc, record) => {
      if (record.identity) {
        acc[record.account] = {
          accountId: record.account,
          name: record.identity[0].info.display,
          email: record.identity[0].info.email,
          image: record.identity[0].info.image,
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

const { $apis, $chains } = networkModel;

const request = createEvent<RequestParams>();

sample({
  clock: request,
  source: { apis: $apis, chains: $chains },
  filter: (_, { accounts }) => accounts.length > 0,
  fn: ({ apis, chains }, { chainId, accounts }) => {
    let chain = chains[chainId];
    let identityChain: Chain | null = null;

    if (nullable(chain)) {
      throw new Error(`Chain ${chainId} not found`);
    }

    while (nullable(identityChain)) {
      if (chain.parentId) {
        chain = chains[chain.parentId];

        if (nullable(chain)) {
          throw new Error(`Parent for ${chainId} not found`);
        }
      } else {
        const identityChainId = chain.additional?.identityChain;

        if (nullable(identityChainId)) {
          throw new Error(`Identity chain not found`);
        }

        identityChain = chains[identityChainId] ?? null;
      }
    }

    const api = apis[identityChain.chainId];

    if (nullable(api)) {
      throw new Error(`ApiPromise for chain ${identityChain.chainId} not found`);
    }

    return {
      accounts,
      chainId,
      api,
    };
  },
  target: requestIdentity,
});

export const identityDomainModel = {
  $list,
  request,
  pending,
  fail,
};
