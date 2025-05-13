import { attach, createEffect, createStore, scopeBind } from 'effector';
import { isEmpty } from 'lodash';
import { readonly } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createAsyncTaskPool, entries, fromEntries, groupBy, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';

import { type FetchParams, fetchIdentity } from './resource';
import { type AccountIdentity } from './types';

const fetchPool = createAsyncTaskPool({
  poolSize: 1,
  retryCount: 5,
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

const requestFx = attach({
  source: {
    chains: networkModel.$chains,
    apis: networkModel.$apis,
  },
  effect({ chains, apis }, { chainId, accounts }: Omit<FetchParams, 'api'>) {
    const bound = scopeBind(fetchIdentity.request, { safe: true });
    const identityChainId = chains[chainId]?.additional?.identityChain ?? chainId;
    const api = apis[identityChainId];

    if (nullable(api)) {
      throw new Error(`Api for chain ${identityChainId} not found`);
    }

    return bound({ accounts, chainId, api });
  },
});

const requestWithRetryFx = createEffect<Omit<FetchParams, 'api'>, Record<AccountId, AccountIdentity>>(
  ({ chainId, accounts }) => {
    const bound = scopeBind(requestFx, { safe: true });
    return fetchPool.call(() => bound({ chainId, accounts }));
  },
);

export const identity = {
  $list: readonly($list),
  request: requestWithRetryFx,
};
