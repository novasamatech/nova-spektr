import { type ApiPromise } from '@polkadot/api';
import { attach } from 'effector';
import { isEmpty, zipWith } from 'lodash';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nullable, withTimeout } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

import { type AccountIdentity, type IdentityMap } from './types';

const LOADING_TIMEOUT = 10_000;

type IdentityData = Record<AccountId, AccountIdentity>;
type RequestParams = {
  accounts: AccountId[];
  chainId: ChainId;
};

type InnerRequestParams = {
  accounts: AccountId[];
  chainId: ChainId;
  api?: ApiPromise;
};

const {
  $: $list,
  request: requestIdentity,
  fulfilled,
  pending,
  fail,
} = createDataSource<IdentityMap, InnerRequestParams, IdentityData>({
  initial: {},
  pool: params => params.chainId,
  cache({ chainId, accounts }, store) {
    const chainIdentitites = store[chainId];
    if (nullable(chainIdentitites)) return false;

    const cachedData: IdentityData = {};
    for (const account of accounts) {
      const identity = chainIdentitites[account];
      if (!identity) {
        return false;
      }
      cachedData[account] = identity;
    }

    return cachedData;
  },
  async fn({ api, accounts }) {
    if (accounts.length === 0 || nullable(api)) return {};

    await api.isReady;

    const subIdentities = await withTimeout(identityPallet.storage.superOf(api, accounts), LOADING_TIMEOUT, null);
    if (nullable(subIdentities)) return {};

    const parentAccounts = subIdentities.map(({ account, identity }) => (nullable(identity) ? account : identity[0]));
    const parentIdentities = await withTimeout(
      identityPallet.storage.identityOf(api, parentAccounts),
      LOADING_TIMEOUT,
      null,
    );

    if (nullable(parentIdentities)) return {};

    const identities = zipWith(subIdentities, parentIdentities, (sub, parent) => ({ sub, parent }));

    const result: IdentityData = {};

    for (const { sub, parent } of identities) {
      if (nullable(parent?.identity)) continue;
      const parentIdentity = Array.isArray(parent.identity) ? parent.identity[0] : parent.identity;

      result[sub.account] = {
        accountId: sub.account,
        subName: sub.identity?.[1],
        name: parentIdentity.info.display,
        email: parentIdentity.info.email,
        image: parentIdentity.info.image,
        github: parentIdentity.info.github,
        matrix: parentIdentity.info.matrix,
      };

      if (sub.account !== parent.account) {
        result[parent.account] = {
          accountId: parent.account,
          subName: sub.identity?.[1],
          name: parentIdentity.info.display,
          email: parentIdentity.info.email,
          image: parentIdentity.info.image,
          matrix: parentIdentity.info.matrix,
        };
      }
    }

    return result;
  },
  map(store, { params, result }) {
    if (isEmpty(result)) return store;

    return {
      ...store,
      [params.chainId]: { ...store[params.chainId], ...result },
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
    const identityChainId = chains[chainId]?.additional?.identityChain ?? chainId;

    const api = apis[identityChainId];

    return { accounts, chainId, api };
  },
});

export const identity = {
  $list,
  $fulfilled: fulfilled,
  request,
  pending,
  fail,
};
