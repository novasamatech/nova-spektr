import { attach, createStore } from 'effector';
import { isEmpty } from 'lodash';
import { readonly } from 'patronum';

import { type ChainId } from '@/shared/core';
import { entries, fromEntries, groupBy, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';

import { type ResourceParams, resource } from './resource';
import { type AccountIdentity } from './types';

const $list = createStore<Record<ChainId, Record<AccountId, AccountIdentity>>>({});

deriveFromResources({
  store: $list,
  resources: [resource],
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

const request = attach({
  effect: resource.request,
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
  },
  mapParams: ({ chainId, accounts }: Omit<ResourceParams, 'api'>, { apis, chains }) => {
    const identityChainId = chains[chainId]?.additional?.identityChain ?? chainId;
    const api = apis[identityChainId];

    if (nullable(api)) {
      throw new Error(`Api for chain ${identityChainId} not found`);
    }

    return { accounts, chainId, api };
  },
});

export const identity = {
  $list: readonly($list),
  request: request,
};
