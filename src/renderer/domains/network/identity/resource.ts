import { type ApiPromise } from '@polkadot/api';
import { attach, createStore } from 'effector';
import { produce } from 'immer';
import { zipWith } from 'lodash';

import { type ChainId } from '@/shared/core';
import { assert, createAsyncTaskPool, entries, groupBy, nullable } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { createQueryResource } from '@/shared/query';
import { networkModel } from '@/entities/network';
import { accountService } from '../account/service';

import { POLKADOT_PEOPLE_CHAIN_ID } from './constants';
import { type AccountIdentity } from './types';

type IdentityMap = Record<AccountId, AccountIdentity>;
type IdentityCache = Record<ChainId, IdentityMap>;

const fetchPool = createAsyncTaskPool({
  poolSize: 1,
  retryCount: 15,
  retryDelay: 1000,
});

const $cache = createStore<IdentityCache>({});

type RequestParams = {
  accounts: AccountId[];
  chainId?: ChainId;
};

type InnerParams = {
  accounts: AccountId[];
  chainId: ChainId;
  api: ApiPromise;
};

const request = async ({ api, chainId, accounts }: InnerParams) => {
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
};

export const identityResource = createQueryResource<RequestParams>({
  key: ({ chainId, accounts }) => [chainId ?? 'any', ...accounts],
})
  .request(
    attach({
      source: {
        chains: networkModel.$chains,
        apis: networkModel.$apis,
      },
      effect({ chains, apis }, { accounts, chainId = POLKADOT_PEOPLE_CHAIN_ID }: RequestParams) {
        let identityChainId = chains[chainId]?.additional?.identityChain ?? chainId;
        let identityChain = chains[identityChainId];
        let api = apis[identityChainId];

        if (nullable(api) || !identityPallet.supportedOn(api)) {
          identityChainId = POLKADOT_PEOPLE_CHAIN_ID;
          api = apis[identityChainId];
          identityChain = chains[identityChainId];
        }

        assert(identityChain, `Chain ${identityChainId} not found`);
        assert(api, `Api for chain ${identityChainId} not found`);

        const supportedAccounts = accounts.filter(id => accountService.isAccountSchemeMatchChain(id, identityChain));

        return request({ accounts: supportedAccounts, chainId, api });
      },
    }),
  )
  .cache({
    staleAfter: Number.POSITIVE_INFINITY,
    store: $cache,
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
  })
  .build();
