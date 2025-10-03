import { attach, createEffect, createStore, scopeBind } from 'effector';
import { isEmpty } from 'lodash';
import { readonly } from 'patronum';

import { type ChainId } from '@/shared/core';
import { assert, createAsyncTaskPool, entries, fromEntries, groupBy, nullable } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';
import { accountService } from '../account/service';

import { POLKADOT_PEOPLE_CHAIN_ID } from './constants';
import { fetchIdentity } from './resource';
import { type AccountIdentity } from './types';

const fetchPool = createAsyncTaskPool({
  poolSize: 1,
  retryCount: 15,
  retryDelay: 1000,
});

const $list = createStore<Record<ChainId, Record<AccountId, AccountIdentity>>>({});

deriveFromResources({
  store: $list,
  resources: [fetchIdentity],
  map(state, identities) {
    if (isEmpty(identities)) return state;

    const groups = groupBy(entries(identities), ([, i]) => i.chainId);
    let next = state;

    for (const [chainId, i] of entries(groups)) {
      if (nullable(i)) continue;

      next = {
        ...next,
        [chainId]: {
          ...next[chainId],
          ...fromEntries(i),
        },
      };
    }

    return next;
  },
});

type RequestParams = {
  accounts: AccountId[];
  chainId?: ChainId;
};

const requestFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  effect({ chains, apis }, { accounts, chainId = POLKADOT_PEOPLE_CHAIN_ID }: RequestParams) {
    const bound = scopeBind(fetchIdentity.request, { safe: true });

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

    return bound({ accounts: supportedAccounts, chainId, api });
  },
});

const requestWithRetryFx = createEffect<RequestParams, Record<AccountId, AccountIdentity>>(params => {
  const bound = scopeBind(requestFx, { safe: true });
  return fetchPool.call(() => bound(params));
});

export const identity = {
  $list: readonly($list),
  request: requestWithRetryFx,
};
