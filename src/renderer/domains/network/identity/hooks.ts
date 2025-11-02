import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useResource } from '@/shared/query';

import { identityResource } from './resource';

export const useIdentities = (accounts: AccountId[], chainId?: ChainId) => {
  return useResource(identityResource, {
    params: { chainId, accounts },
    defaultValue: {},
    map: (cache, { chainId }) => chainId && cache[chainId],
    filter: (value, { accounts }) => accounts.every(a => a in value),
  });
};
