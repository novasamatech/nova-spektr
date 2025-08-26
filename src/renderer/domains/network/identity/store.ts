import { attach, createEffect, createStore, scopeBind } from 'effector';
import { isEmpty } from 'lodash';
import { readonly } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createAsyncTaskPool, entries, fromEntries, groupBy, nullable } from '@/shared/lib/utils';
import { identityPallet } from '@/shared/pallet/identity';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';

import { POLKADOT_PEOPLE_CHAIN_ID } from './constants';
import { fetchIdentity } from './resource';
import { type AccountIdentity } from './types';

const fetchPool = createAsyncTaskPool({
  poolSize: 1,
  retryCount: 15,
  retryDelay: 2000,
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
    const identityChainId = chains[chainId]?.additional?.identityChain ?? chainId;
    let api = apis[identityChainId];

    if (nullable(api)) {
      throw new Error(`Api for chain ${identityChainId} not found`);
    }

    if (!identityPallet.supportedOn(api)) {
      api = apis[POLKADOT_PEOPLE_CHAIN_ID];

      if (nullable(api)) {
        throw new Error(`Polkadot People chain not found`);
      }
    }

    return bound({ accounts, chainId, api });
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
