import { type ApiPromise } from '@polkadot/api';
import { createEvent, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

import { identityService } from './service';
import { type AccountIdentity } from './types';

type IdentityData = Record<AccountId, AccountIdentity>;
type IdentityStore = Record<ChainId, IdentityData>;
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
} = createDataSource<IdentityStore, InnerRequestParams, IdentityData>({
  initial: {},
  mutateParams(params, store) {
    const chainIdentities = store[params.chainId] ?? {};
    const accounts = params.accounts.filter(account => !(account in chainIdentities));

    return {
      chainId: params.chainId,
      api: params.api,
      accounts,
    };
  },
  filter: ({ accounts }) => accounts.length > 0,
  async fn({ api, accounts }) {
    const response = await identityPallet.storage.identityOf(api, accounts);

    return response.reduce<IdentityData>((acc, record) => {
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
  source: {
    apis: $apis,
    chains: $chains,
  },
  fn: ({ apis, chains }, { chainId, accounts }) => {
    const identityChain = identityService.findIdentityChain(chains, chainId);
    if (nullable(identityChain)) {
      throw new Error(`Chain path from ${chainId} is broken, trace chain.parentId fields in config.`);
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
