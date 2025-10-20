import { type Cache } from '@apollo/client';
import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';
import { produce } from 'immer';
import { zipWith } from 'lodash';

import { type ChainId } from '@/shared/core';
import { createAsyncTaskPool, entries, groupBy, nullable } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createSingularResource } from '@/shared/resource2';

import { type AccountIdentity } from './types';

type Response = Record<AccountId, AccountIdentity>;
type Cache = Record<ChainId, Response>;

const fetchPool = createAsyncTaskPool({
  poolSize: 1,
  retryCount: 15,
  retryDelay: 1000,
});

export const $cache = createStore<Record<ChainId, Record<AccountId, AccountIdentity>>>({});

export type FetchParams = {
  accounts: AccountId[];
  chainId: ChainId;
  api: ApiPromise;
};

export const identitySigngularResource = createSingularResource<FetchParams, Response, Cache>({
  cache: $cache,
  requestCacheTimeout: Number.POSITIVE_INFINITY,
  key: ({ chainId, accounts }) => [chainId, ...accounts],
  async request({ params: { api, chainId, accounts } }) {
    if (accounts.length === 0) return {};

    return fetchPool.call(async () => {
      const subIdentities = await identityPallet.storage.superOf(api, accounts);
      const parentAccounts = subIdentities.map(({ account, identity }) => (nullable(identity) ? account : identity[0]));
      const parentIdentities = await identityPallet.storage.identityOf(api, parentAccounts);

      const identities = zipWith(subIdentities, parentIdentities, (sub, parent) => ({ sub, parent }));

      const result: Record<AccountId, AccountIdentity> = {};

      for (const { sub, parent } of identities) {
        if (nullable(parent?.identity)) continue;
        const parentIdentity = Array.isArray(parent.identity) ? parent.identity[0] : parent.identity;

        result[sub.account] = {
          chainId,
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
            chainId,
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
    });
  },
  map(cache, identities) {
    return produce(cache, draft => {
      const groups = groupBy(entries(identities), ([, i]) => i.chainId);

      for (const [chainId, identities] of entries(groups)) {
        if (nullable(identities)) continue;

        let chainIdentities = draft[chainId];
        if (nullable(chainIdentities)) {
          chainIdentities = {};
          draft[chainId] = chainIdentities;
        }

        for (const [accountId, identity] of identities) {
          chainIdentities[accountId] = identity;
        }
      }
    });
  },
});
