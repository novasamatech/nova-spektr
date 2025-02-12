import { type ApiPromise } from '@polkadot/api';
import { attach } from 'effector';

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
  fulfilled,
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
    const subIdentities = await identityPallet.storage.superOf(api, accounts);
    const parentAccounts = subIdentities.map(sub => sub.parent);
    const parentIdentities = await identityPallet.storage.identityOf(api, parentAccounts);

    const result: IdentityData = {};

    for (let index = 0; index < parentIdentities.length; index++) {
      const parent = parentIdentities[index];
      if (nullable(parent?.identity)) continue;

      const subIdentityName = subIdentities[index]?.name;
      const identityName = parent.identity[0].info.display;

      result[parent.account] = {
        accountId: parent.account,
        name: subIdentityName ? `${identityName}/${subIdentityName}` : identityName,
        email: parent.identity[0].info.email,
        image: parent.identity[0].info.image,
      };
    }

    return result;
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

const request = attach({
  effect: requestIdentity,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
  },
  mapParams: ({ chainId, accounts }: RequestParams, { apis, chains }) => {
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
});

export const identityDomainModel = {
  $list,
  $fulfilled: fulfilled,
  request,
  pending,
  fail,
};
